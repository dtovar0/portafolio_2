"""
Autorización centralizada de Nexus.

Este módulo concentra las reglas de acceso que antes estaban repartidas en los
blueprints. Todo el resto de la aplicación debe pedir permisos aquí en lugar de
comparar `current_user.role` a mano.

Niveles de acceso (de mayor a menor):
    administrador -> acceso global a todas las áreas y plataformas
    usuario       -> solo las áreas que tiene asignadas

La Fase 1 añadirá el rol intermedio `admin_area`; por eso las funciones de
alcance (`scoped_*`) resuelven el nivel en un solo lugar.
"""

from functools import wraps

from flask import abort, flash, jsonify, redirect, request, url_for
from flask_login import current_user

ROLE_ADMIN = 'administrador'


# --------------------------------------------------------------------------- #
# Consultas de rol
# --------------------------------------------------------------------------- #

def is_admin(user=None):
    """True si el usuario es administrador global.

    Compara en minúsculas porque el rol llega de LDAP y de las cabeceras de
    Authelia sin normalizar.
    """
    user = user or current_user
    if not user or not user.is_authenticated:
        return False
    return (user.role or '').lower() == ROLE_ADMIN


def user_area_ids(user=None, only_active=False):
    """IDs de las áreas asignadas al usuario."""
    user = user or current_user
    areas = user.areas or []
    if only_active:
        areas = [a for a in areas if a.status == 'Activo']
    return [a.id for a in areas]


# --------------------------------------------------------------------------- #
# Alcance de datos (row-level scoping)
# --------------------------------------------------------------------------- #

def scoped_areas(user=None, only_active=False):
    """Query de las áreas visibles para el usuario."""
    from app.modules.core.models import Area

    user = user or current_user
    if is_admin(user):
        query = Area.query
    else:
        query = Area.query.filter(Area.id.in_(user_area_ids(user)))
    if only_active:
        query = query.filter(Area.status == 'Activo')
    return query


def scoped_platforms(user=None):
    """Query de las plataformas visibles para el usuario.

    Un usuario ve las plataformas de las áreas que tiene asignadas.
    """
    from app.modules.core.models import Platform

    user = user or current_user
    if is_admin(user):
        return Platform.query
    return Platform.query.filter(Platform.area_id.in_(user_area_ids(user)))


def can_access_platform(platform, user=None):
    """True si el usuario puede ver/usar esa plataforma."""
    if platform is None:
        return False
    user = user or current_user
    if is_admin(user):
        return True
    return platform.area_id in user_area_ids(user)


def can_manage_area(area_id, user=None):
    """True si el usuario puede administrar el área indicada.

    Hoy solo el administrador global; en la Fase 1 lo podrá también el
    `admin_area` de esa área.
    """
    return is_admin(user)


# --------------------------------------------------------------------------- #
# Decoradores
# --------------------------------------------------------------------------- #

def _wants_json():
    """True si la petición espera JSON en lugar de una redirección HTML.

    Sin esto, una llamada `fetch()` a una ruta protegida recibe un 302 hacia el
    dashboard y el JS falla al parsear HTML como JSON.
    """
    if request.is_json or request.path.startswith('/api/') or '/api/' in request.path:
        return True
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return True
    accept = request.accept_mimetypes
    return accept['application/json'] >= accept['text/html']


def _deny(message='Acceso restringido. Se requieren permisos de administrador.'):
    """Respuesta de acceso denegado, en el formato que espera quien llama."""
    if _wants_json():
        return jsonify({'status': 'error', 'message': message}), 403
    flash(message, 'warning')
    return redirect(url_for('core.index'))


def admin_required(f):
    """Restringe la vista al administrador global."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_admin():
            return _deny()
        return f(*args, **kwargs)
    return decorated_function


def area_admin_required(area_arg='area_id'):
    """Restringe la vista a quien pueda administrar el área indicada.

    Toma el id del área de los argumentos de la ruta (`area_arg`). Hoy equivale
    a `admin_required`; la Fase 1 le dará sentido propio con el rol `admin_area`.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            area_id = kwargs.get(area_arg)
            if not can_manage_area(area_id):
                return _deny('No tienes permisos para administrar esta área.')
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def platform_access_required(platform_arg='platform_id'):
    """Restringe la vista a quien tenga acceso a la plataforma indicada."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from app.modules.core.models import Platform

            platform_id = kwargs.get(platform_arg)
            platform = Platform.query.get(platform_id)
            if platform is None:
                abort(404)
            if not can_access_platform(platform):
                return _deny('No tienes acceso a esta plataforma.')
            return f(*args, **kwargs)
        return decorated_function
    return decorator
