"""
Rutas heredadas de áreas.

La gestión vive en `/api/v1/areas`.
"""

import os

from flask import Blueprint, jsonify, redirect

areas_bp = Blueprint('areas_module', __name__, url_prefix='/admin/areas')


def _moved(replacement):
    return jsonify({'status': 'error', 'message': 'Endpoint retirado.',
                    'use': replacement}), 410


@areas_bp.route('/')
def areas_list():
    frontend = os.getenv('FRONTEND_URL', '')
    if frontend:
        return redirect(frontend + '/areas')
    return _moved('GET /api/v1/areas')


@areas_bp.route('/add', methods=['POST'])
def add_area():
    return _moved('POST /api/v1/areas')


@areas_bp.route('/edit/<int:area_id>', methods=['POST'])
def edit_area(area_id):
    return _moved('PUT /api/v1/areas/<id>')


@areas_bp.route('/delete/<int:area_id>', methods=['DELETE'])
def delete_area(area_id):
    return _moved('DELETE /api/v1/areas/<id>')


@areas_bp.route('/delete-bulk', methods=['POST'])
def delete_areas_bulk():
    return _moved('DELETE /api/v1/areas/<id>')


@areas_bp.route('/users/<int:area_id>')
def get_area_users(area_id):
    return _moved('GET /api/v1/users')


@areas_bp.route('/users/update/<int:area_id>', methods=['POST'])
def update_area_users(area_id):
    return _moved('PUT /api/v1/areas/<id>/users')
