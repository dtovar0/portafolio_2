"""
Rutas heredadas de auditoría.

El registro se consulta en `/api/v1/audit`.
"""

import os

from flask import Blueprint, jsonify, redirect

audit_bp = Blueprint('audit', __name__, url_prefix='/audit')


@audit_bp.route('/')
def index():
    frontend = os.getenv('FRONTEND_URL', '')
    if frontend:
        return redirect(frontend + '/audit')
    return jsonify({'status': 'error', 'message': 'Endpoint retirado.',
                    'use': 'GET /api/v1/audit'}), 410


@audit_bp.route('/api/list')
def list_audit():
    return jsonify({'status': 'error', 'message': 'Endpoint retirado.',
                    'use': 'GET /api/v1/audit'}), 410
