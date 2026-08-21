"""
Rutas del núcleo.

Flask es solo API: la interfaz completa vive en el frontend Next.js, que
consume `/api/v1`. Aquí solo quedan redirecciones de rutas heredadas.
"""

import os

from flask import Blueprint, jsonify, redirect

core_bp = Blueprint("core", __name__, url_prefix="/")

# Origen del frontend. Tras Nginx ambos servicios comparten dominio y basta la
# ruta relativa; en desarrollo apunta al puerto de Next.js.
FRONTEND_URL = os.getenv('FRONTEND_URL', '')


@core_bp.route("/")
def index():
    """Punto de entrada heredado.

    Sin FRONTEND_URL, redirigir a "/" apuntaría a esta misma ruta y crearía un
    bucle, así que se responde con la indicación en JSON.
    """
    if not FRONTEND_URL:
        return jsonify({
            'service': 'nexus-api',
            'message': 'Este servicio es solo API. La interfaz la sirve el frontend.',
            'api': '/api/v1',
        })
    return redirect(FRONTEND_URL + '/')


@core_bp.route("/portal")
def portal():
    """Ruta heredada: el catálogo ahora es /platforms en el frontend."""
    return redirect(FRONTEND_URL + '/platforms') if FRONTEND_URL else (
        jsonify({'status': 'moved', 'to': '/platforms'}), 410)


@core_bp.route("/api/stats")
def get_stats():
    """Ruta heredada: usar /api/v1/stats."""
    return jsonify({"status": "deprecated", "use": "/api/v1/stats"}), 410
