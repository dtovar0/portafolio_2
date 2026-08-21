"""
Rutas heredadas de autenticación.

La lógica vive en `/api/v1/auth` (sesión) y `/api/v1/auth-config` (directorio).
Estas rutas solo redirigen a la interfaz o señalan su reemplazo, para no romper
enlaces guardados ni dejar clientes antiguos fallando en silencio.
"""

import os

from flask import Blueprint, jsonify, redirect
from flask_login import current_user

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _frontend(path):
    """URL del frontend Next.js, que sirve la interfaz."""
    return (os.getenv('FRONTEND_URL', '') or '') + path


def _moved(replacement):
    """410 Gone indicando qué endpoint usar en su lugar."""
    return jsonify({'status': 'error',
                    'message': 'Endpoint retirado.',
                    'use': replacement}), 410


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    """La pantalla de acceso vive en el frontend; la lógica, en /api/v1/auth."""
    if current_user.is_authenticated:
        return redirect(_frontend('/'))
    return redirect(_frontend('/login'))


@auth_bp.route("/logout")
def logout():
    """El cierre de sesión lo gestiona /api/v1/auth/logout."""
    return redirect(_frontend('/logout'))


@auth_bp.route("/")
def index():
    """La configuración del directorio está en los ajustes del frontend."""
    return redirect(_frontend('/settings'))


@auth_bp.route("/save", methods=["POST"])
def save():
    return _moved('PUT /api/v1/auth-config')


@auth_bp.route("/test_ldap", methods=["POST"])
def test_ldap():
    return _moved('POST /api/v1/auth-config/test')


@auth_bp.route("/preferences/save", methods=["POST"])
def save_preferences():
    return _moved('PUT /api/v1/me/preferences')


@auth_bp.route("/users/list")
def list_users():
    return _moved('GET /api/v1/users')


@auth_bp.route("/users/create", methods=["POST"])
def create_user():
    return _moved('POST /api/v1/users')


@auth_bp.route("/users/update", methods=["POST"])
def update_user():
    return _moved('PUT /api/v1/users/<id>')


@auth_bp.route("/users/delete", methods=["POST"])
def delete_users():
    return _moved('DELETE /api/v1/users/<id>')


@auth_bp.route("/users/purge", methods=["POST"])
def purge_users():
    return _moved('POST /api/v1/users/purge')
