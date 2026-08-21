"""
Rutas del núcleo.

El dashboard y el catálogo viven ahora en el frontend Next.js, que consume
`/api/v1`. Aquí solo queda lo que el portal Jinja restante necesita: el
servidor de assets y la redirección de las rutas heredadas.
"""

import os

from flask import (Blueprint, current_app, jsonify, redirect,
                   send_from_directory, url_for)
from flask_login import login_required

core_bp = Blueprint("core", __name__, url_prefix="/")

# Origen del frontend. En producción Nginx sirve ambos bajo el mismo dominio,
# así que basta la ruta raíz.
FRONTEND_URL = os.getenv('FRONTEND_URL', '/')


@core_bp.route("/")
@login_required
def index():
    """Punto de entrada: la interfaz la sirve el frontend Next.js."""
    return redirect(FRONTEND_URL)


@core_bp.route("/portal")
@login_required
def portal():
    """Ruta heredada: el catálogo ahora es /platforms en el frontend."""
    return redirect(FRONTEND_URL)


@core_bp.route('/assets/<path:filename>')
def serve_assets(filename):
    """Assets del portal Jinja que aún queda (settings, notificaciones, LDAP)."""
    try:
        return send_from_directory(
            os.path.join(current_app.root_path, '../assets'), filename)
    except Exception as e:
        current_app.logger.error(f"Error sirviendo asset {filename}: {e}")
        return "Asset not found", 404


@core_bp.route("/api/stats")
@login_required
def get_stats():
    """Ruta heredada: usar /api/v1/stats."""
    return jsonify({"status": "deprecated", "use": "/api/v1/stats"}), 410
