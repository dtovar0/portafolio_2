"""
API v1 — operaciones de escritura.

Separado de `routes.py` (lectura) para que las reglas de permisos de cada
mutación queden juntas y a la vista.
"""

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app import db
from app.authz import (admin_required, any_admin_required, area_admin_required,
                       can_manage_area, can_manage_user, is_admin,
                       platform_manage_required, scoped_areas, scoped_users)
from app.modules.audit.services import add_audit_log
from app.modules.auth.models import User
from app.modules.core.models import Area, Platform
from app.utils.naming import sanitize_display_name

crud_bp = Blueprint('api_crud', __name__, url_prefix='/api/v1')


def _payload():
    return request.get_json(silent=True) or {}


def _error(message, status=400):
    return jsonify({'status': 'error', 'message': message}), status


# --------------------------------------------------------------------------- #
# Áreas
# --------------------------------------------------------------------------- #

@crud_bp.route('/areas', methods=['POST'])
@login_required
@admin_required
def create_area():
    """Crear un área es crear un tenant: solo el superadmin."""
    data = _payload()
    name = sanitize_display_name(data.get('name'), fallback='')
    if not name:
        return _error('El nombre es obligatorio.')
    if Area.query.filter_by(name=name).first():
        return _error('Ya existe un área con ese nombre.', 409)

    area = Area(
        name=name,
        description=data.get('description'),
        icon=data.get('icon') or 'box',
        color=data.get('color') or '#6366f1',
        status=data.get('status') or 'Activo',
    )
    db.session.add(area)
    db.session.commit()
    add_audit_log(f"CREAR ÁREA: {name}", module='Áreas', target=name,
                  status='success')
    return jsonify({'status': 'success', 'area': area.to_dict()}), 201


@crud_bp.route('/areas/<int:area_id>', methods=['PUT'])
@login_required
@area_admin_required('area_id')
def update_area(area_id):
    area = Area.query.get_or_404(area_id)
    data = _payload()

    if 'name' in data:
        name = sanitize_display_name(data.get('name'), fallback='')
        if not name:
            return _error('El nombre es obligatorio.')
        clash = Area.query.filter(Area.name == name, Area.id != area_id).first()
        if clash:
            return _error('Ya existe un área con ese nombre.', 409)
        area.name = name

    for field in ('description', 'icon', 'color', 'status'):
        if field in data:
            setattr(area, field, data[field])

    db.session.commit()
    add_audit_log(f"EDITAR ÁREA: {area.name}", module='Áreas',
                  target=area.name, status='success')
    return jsonify({'status': 'success', 'area': area.to_dict()})


@crud_bp.route('/areas/<int:area_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_area(area_id):
    """Borrar un área elimina un tenant: solo el superadmin."""
    area = Area.query.get_or_404(area_id)
    if area.platforms:
        return _error(
            f'El área tiene {len(area.platforms)} plataforma(s). '
            'Reasígnalas o elimínalas primero.', 409)

    name = area.name
    db.session.delete(area)
    db.session.commit()
    add_audit_log(f"ELIMINAR ÁREA: {name}", module='Áreas', target=name,
                  status='warning')
    return jsonify({'status': 'success'})


@crud_bp.route('/areas/<int:area_id>/users', methods=['PUT'])
@login_required
@area_admin_required('area_id')
def set_area_users(area_id):
    """Define qué usuarios pertenecen al área."""
    area = Area.query.get_or_404(area_id)
    user_ids = _payload().get('user_ids') or []

    # Solo usuarios dentro del alcance de quien administra.
    allowed = {u.id for u in scoped_users().all()}
    rejected = [i for i in user_ids if i not in allowed]
    if rejected:
        return _error('Hay usuarios fuera de tu alcance.', 403)

    current = list(area.area_users or [])
    # Conserva a quien esté fuera del alcance (p. ej. un superadmin).
    keep = [u for u in current if u.id not in allowed]
    area.area_users = keep + User.query.filter(User.id.in_(user_ids)).all()
    db.session.commit()
    add_audit_log(f"ACTUALIZAR USUARIOS DE ÁREA: {area.name}", module='Áreas',
                  target=area.name, status='success')
    return jsonify({'status': 'success',
                    'user_ids': [u.id for u in area.area_users]})


# --------------------------------------------------------------------------- #
# Plataformas
# --------------------------------------------------------------------------- #

def _apply_platform_fields(platform, data):
    """Copia los campos editables del payload a la plataforma."""
    if 'name' in data:
        platform.name = sanitize_display_name(data.get('name'), fallback='')
    for field in ('description', 'direct_link', 'icon', 'logo_url',
                  'bg_color', 'text_color', 'status'):
        if field in data:
            setattr(platform, field, data[field])


@crud_bp.route('/platforms', methods=['POST'])
@login_required
@any_admin_required
def create_platform():
    data = _payload()
    name = sanitize_display_name(data.get('name'), fallback='')
    if not name:
        return _error('El nombre es obligatorio.')

    area_id = data.get('area_id')
    if not can_manage_area(area_id):
        return _error('No administras el área indicada.', 403)

    platform = Platform(
        name=name,
        description=data.get('description') or '',
        area_id=area_id,
        direct_link=data.get('direct_link'),
        icon=data.get('icon') or 'box',
        logo_url=data.get('logo_url'),
        bg_color=data.get('bg_color') or '#6366f1',
        text_color=data.get('text_color') or '#ffffff',
        status=data.get('status') or 'Activo',
    )
    db.session.add(platform)
    db.session.commit()
    add_audit_log(f"CREAR PLATAFORMA: {name}", module='Plataformas',
                  target=name, status='success')
    return jsonify({'status': 'success', 'platform': platform.to_dict()}), 201


@crud_bp.route('/platforms/<int:platform_id>', methods=['PUT'])
@login_required
@platform_manage_required('platform_id')
def update_platform(platform_id):
    platform = Platform.query.get_or_404(platform_id)
    data = _payload()

    # Mover de área exige administrar también la de destino.
    if 'area_id' in data and data['area_id'] != platform.area_id:
        if not can_manage_area(data['area_id']):
            return _error('No administras el área de destino.', 403)
        platform.area_id = data['area_id']

    _apply_platform_fields(platform, data)
    if not platform.name:
        return _error('El nombre es obligatorio.')

    db.session.commit()
    add_audit_log(f"EDITAR PLATAFORMA: {platform.name}", module='Plataformas',
                  target=platform.name, status='success')
    return jsonify({'status': 'success', 'platform': platform.to_dict()})


@crud_bp.route('/platforms/<int:platform_id>', methods=['DELETE'])
@login_required
@platform_manage_required('platform_id')
def delete_platform(platform_id):
    platform = Platform.query.get_or_404(platform_id)
    name = platform.name
    db.session.delete(platform)
    db.session.commit()
    add_audit_log(f"ELIMINAR PLATAFORMA: {name}", module='Plataformas',
                  target=name, status='warning')
    return jsonify({'status': 'success'})


@crud_bp.route('/platforms/<int:platform_id>/users', methods=['PUT'])
@login_required
@platform_manage_required('platform_id')
def set_platform_users(platform_id):
    """Define qué usuarios tienen asignada la plataforma."""
    platform = Platform.query.get_or_404(platform_id)
    user_ids = _payload().get('user_ids') or []

    allowed = {u.id for u in scoped_users().all()}
    if [i for i in user_ids if i not in allowed]:
        return _error('Hay usuarios fuera de tu alcance.', 403)

    keep = [u for u in platform.platform_users.all() if u.id not in allowed]
    platform.platform_users = keep + User.query.filter(User.id.in_(user_ids)).all()
    db.session.commit()
    add_audit_log(f"ACTUALIZAR ACCESO: {platform.name}", module='Plataformas',
                  target=platform.name, status='success')
    return jsonify({'status': 'success'})


# --------------------------------------------------------------------------- #
# Usuarios
# --------------------------------------------------------------------------- #

ASSIGNABLE_ROLES = ('usuario', 'admin_area')
RESERVED_NAMES = ('admin',)


def _check_role(role):
    """Valida el rol solicitado según quién lo pide.

    Solo el superadmin puede crear o promover a superadmin; sin esto, un admin
    de área podría escalar privilegios a través del formulario.
    """
    if not role:
        return None, None
    if role == 'administrador' and not is_admin():
        return None, 'No puedes asignar el rol de administrador global.'
    if role != 'administrador' and role not in ASSIGNABLE_ROLES:
        return None, f'Rol no válido: {role}'
    return role, None


@crud_bp.route('/users', methods=['POST'])
@login_required
@any_admin_required
def create_user():
    data = _payload()
    email = (data.get('email') or '').strip().lower()
    if not email:
        return _error('El correo es obligatorio.')
    if email in RESERVED_NAMES:
        return _error('Ese identificador está reservado por el sistema.', 403)
    if User.query.filter(db.func.lower(User.email) == email).first():
        return _error('El correo ya está registrado.', 409)

    role, problem = _check_role(data.get('role') or 'usuario')
    if problem:
        return _error(problem, 403)

    # Solo áreas dentro del alcance de quien crea.
    allowed = {a.id for a in scoped_areas().all()}
    area_ids = [i for i in (data.get('area_ids') or []) if i in allowed]

    user = User(
        email=email,
        nombre=sanitize_display_name(data.get('name'), fallback=email),
        role=role,
        auth_source=data.get('auth_source') or 'local',
        is_active=data.get('is_active', True),
    )
    user.set_password(data.get('password') or 'nexus123')
    user.areas = Area.query.filter(Area.id.in_(area_ids)).all()
    if role == 'admin_area':
        user.managed_areas = user.areas

    db.session.add(user)
    db.session.commit()
    add_audit_log(f"CREAR USUARIO: {email}", module='Usuarios', target=email,
                  status='success')
    return jsonify({'status': 'success', 'id': user.id}), 201


@crud_bp.route('/users/<int:user_id>', methods=['PUT'])
@login_required
@any_admin_required
def update_user(user_id):
    target = User.query.get_or_404(user_id)
    if not can_manage_user(target):
        return _error('No puedes administrar este usuario.', 403)

    data = _payload()
    if 'role' in data:
        role, problem = _check_role(data['role'])
        if problem:
            return _error(problem, 403)
        target.role = role
        # Dejar de ser admin_area retira las áreas administradas.
        if role != 'admin_area':
            target.managed_areas = []

    if 'name' in data:
        target.nombre = sanitize_display_name(data['name'], fallback=target.email)
    if 'is_active' in data:
        target.is_active = bool(data['is_active'])
    if data.get('password'):
        target.set_password(data['password'])

    if 'managed_area_ids' in data:
        allowed = {a.id for a in scoped_areas().all()}
        ids = [i for i in data['managed_area_ids'] if i in allowed]
        keep = [a for a in (target.managed_areas or []) if a.id not in allowed]
        target.managed_areas = keep + Area.query.filter(Area.id.in_(ids)).all()

    db.session.commit()
    add_audit_log(f"EDITAR USUARIO: {target.email}", module='Usuarios',
                  target=target.email, status='success')
    return jsonify({'status': 'success'})


@crud_bp.route('/users/<int:user_id>', methods=['DELETE'])
@login_required
@any_admin_required
def delete_user(user_id):
    target = User.query.get_or_404(user_id)
    if not can_manage_user(target):
        return _error('No puedes administrar este usuario.', 403)
    if target.id == current_user.id:
        return _error('No puedes eliminar tu propia cuenta.', 409)
    if target.email in RESERVED_NAMES:
        return _error('La cuenta maestra no se puede eliminar.', 403)

    email = target.email
    db.session.delete(target)
    db.session.commit()
    add_audit_log(f"ELIMINAR USUARIO: {email}", module='Usuarios', target=email,
                  status='warning')
    return jsonify({'status': 'success'})


@crud_bp.route('/users/<int:user_id>/platforms', methods=['PUT'])
@login_required
@any_admin_required
def set_user_platforms(user_id):
    """Asigna plataformas concretas a un usuario."""
    from app.authz import scoped_platforms

    target = User.query.get_or_404(user_id)
    if not can_manage_user(target):
        return _error('No puedes administrar este usuario.', 403)

    platform_ids = _payload().get('platform_ids') or []
    allowed = {p.id for p in scoped_platforms().all()}
    if [i for i in platform_ids if i not in allowed]:
        return _error('Hay plataformas fuera de tu alcance.', 403)

    keep = [p for p in target.platforms if p.id not in allowed]
    target.platforms = keep + Platform.query.filter(
        Platform.id.in_(platform_ids)).all()
    db.session.commit()
    add_audit_log(f"ACTUALIZAR ACCESOS: {target.email}", module='Usuarios',
                  target=target.email, status='success')
    return jsonify({'status': 'success'})


# --------------------------------------------------------------------------- #
# Preferencias propias
# --------------------------------------------------------------------------- #

@crud_bp.route('/me/preferences', methods=['PUT'])
@login_required
def save_preferences():
    """Cada usuario edita solo sus propias preferencias."""
    data = _payload()
    if 'notifications' in data:
        current_user.pref_notifications = bool(data['notifications'])
    if 'email_notifications' in data:
        current_user.pref_email_notifications = bool(data['email_notifications'])
    if 'tour_enabled' in data:
        current_user.pref_tour_enabled = bool(data['tour_enabled'])
    if 'refresh_interval' in data:
        try:
            # Acotado para que un valor bajo no genere un bucle de peticiones.
            interval = int(data['refresh_interval'])
            current_user.pref_refresh_interval = max(15, min(interval, 3600))
        except (TypeError, ValueError):
            return _error('Intervalo no válido.')

    db.session.commit()
    return jsonify({'status': 'success', 'preferences': {
        'notifications': current_user.pref_notifications,
        'email_notifications': current_user.pref_email_notifications,
        'refresh_interval': current_user.pref_refresh_interval,
        'tour_enabled': current_user.pref_tour_enabled,
    }})
