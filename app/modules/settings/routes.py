"""
Rutas heredadas de ajustes.

La configuración se gestiona desde el frontend a través de `/api/v1/settings`,
`/api/v1/smtp`, `/api/v1/auth-config` y `/api/v1/backup`. Estas rutas solo
existen para no romper enlaces guardados.
"""

import os

from flask import Blueprint, jsonify, redirect

settings_bp = Blueprint("settings", __name__, url_prefix="/settings")


def _frontend(path):
    """URL del frontend Next.js, que sirve la interfaz."""
    return (os.getenv('FRONTEND_URL', '') or '') + path


@settings_bp.route("/")
def index():
    return redirect(_frontend('/settings'))


@settings_bp.route("/save", methods=["POST"])
def save():
    return jsonify({'status': 'error',
                    'message': 'Usa PUT /api/v1/settings.'}), 410


@settings_bp.route("/export", methods=["GET"])
def export_config():
    return redirect('/api/v1/backup')


@settings_bp.route("/import", methods=["POST"])
def import_config():
    return jsonify({'status': 'error',
                    'message': 'Usa POST /api/v1/backup.'}), 410
