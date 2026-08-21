"""
Rutas heredadas de notificaciones.

La gestión vive en el frontend a través de `/api/v1/smtp`, `/api/v1/templates`
y `/api/v1/notifications`. Estas rutas solo redirigen o señalan su reemplazo,
para no romper enlaces guardados ni clientes antiguos en silencio.
"""

import os

from flask import Blueprint, jsonify, redirect

notifications_bp = Blueprint("notifications", __name__,
                             url_prefix="/notifications")


def _frontend(path):
    return (os.getenv('FRONTEND_URL', '') or '') + path


def _moved(replacement):
    """410 Gone indicando qué endpoint usar en su lugar."""
    return jsonify({'status': 'error',
                    'message': 'Endpoint retirado.',
                    'use': replacement}), 410


@notifications_bp.route("/")
def index():
    target = _frontend('/notifications')
    return redirect(target) if target else _moved('GET /api/v1/notifications')


@notifications_bp.route("/save", methods=["POST"])
def save():
    return _moved('PUT /api/v1/smtp')


@notifications_bp.route("/test", methods=["POST"])
def test():
    return _moved('POST /api/v1/smtp/test')


@notifications_bp.route("/templates/get/<slug>")
def get_template(slug):
    return _moved('GET /api/v1/templates')


@notifications_bp.route("/templates/save", methods=["POST"])
def save_template():
    return _moved('PUT /api/v1/templates/<slug>')


@notifications_bp.route("/api/active")
def active():
    return _moved('GET /api/v1/notifications')


@notifications_bp.route("/api/mark-read", methods=["POST"])
def mark_read():
    return _moved('POST /api/v1/notifications/read')


@notifications_bp.route("/api/delete-all", methods=["DELETE"])
def delete_all():
    return _moved('DELETE /api/v1/notifications')
