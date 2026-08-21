"""
Rutas heredadas de usuarios.

La gestión vive en `/api/v1/users`; la búsqueda en el directorio, en
`/api/v1/directory/search`.
"""

import os

from flask import Blueprint, jsonify, redirect

users_bp = Blueprint('users_module', __name__, url_prefix='/admin')


def _moved(replacement):
    return jsonify({'status': 'error', 'message': 'Endpoint retirado.',
                    'use': replacement}), 410


@users_bp.route('/users')
def users_list():
    frontend = os.getenv('FRONTEND_URL', '')
    if frontend:
        return redirect(frontend + '/users')
    return _moved('GET /api/v1/users')


@users_bp.route('/areas-api')
def areas_api():
    return _moved('GET /api/v1/areas')


@users_bp.route('/add-user', methods=['POST'])
def add_user():
    return _moved('POST /api/v1/users')


@users_bp.route('/edit-user/<int:user_id>', methods=['POST'])
def edit_user(user_id):
    return _moved('PUT /api/v1/users/<id>')


@users_bp.route('/delete-user/<int:user_id>', methods=['POST'])
def delete_user(user_id):
    return _moved('DELETE /api/v1/users/<id>')


@users_bp.route('/user-access/<int:user_id>')
def user_access(user_id):
    return _moved('GET /api/v1/users')


@users_bp.route('/update-user-access/<int:user_id>', methods=['POST'])
def update_user_access(user_id):
    return _moved('PUT /api/v1/users/<id>/platforms')


@users_bp.route('/update-user-areas/<int:user_id>', methods=['POST'])
def update_user_areas(user_id):
    return _moved('PUT /api/v1/users/<id>/areas')


@users_bp.route('/ldap-search-api')
def ldap_search_api():
    return _moved('GET /api/v1/directory/search')
