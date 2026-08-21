from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from app.authz import admin_required
from app.modules.core.models import Area, Platform
from app.modules.auth.models import User
from app.modules.audit.models import AuditLog
from app.modules.drive.utils import StorageManager
import json
import os

areas_bp = Blueprint('areas_module', __name__, url_prefix='/admin/areas')

@areas_bp.route('/')
@login_required
@admin_required
def areas_list():
    areas = Area.query.all()
    users = User.query.filter_by(is_active=True).all()
    
    # Adapt data for JS
    areas_data = []
    for a in areas:
        areas_data.append({
            'id': a.id,
            'name': a.name,
            'description': a.description,
            'icon': a.icon,
            'color': a.color,
            'status': a.status,
            'users_count': len(a.area_users) if hasattr(a, 'area_users') else 0,
            'platforms_count': len(a.platforms) if hasattr(a, 'platforms') else 0
        })
    
    users_data = [{'id': u.id, 'name': u.nombre or u.email, 'email': u.email} for u in users]
    
    return render_template('areas.html', 
                         areas_json=areas_data, 
                         all_users_json=users_data)

@areas_bp.route('/add', methods=['POST'])
@login_required
@admin_required
def add_area():
    try:
        data = request.get_json()
        name = data.get('name')
        # Saneamiento de nombre para seguridad de archivos
        safe_name = StorageManager.sanitize_filename(name)
        
        if Area.query.filter_by(name=safe_name).first():
            return jsonify({'status': 'error', 'message': 'El nombre del área ya existe o es inválido'}), 400
            
        new_area = Area(
            name=safe_name,
            description=data.get('description'),
            icon=data.get('icon', 'box'),
            color=data.get('color', '#6366f1'),
            status=data.get('status', 'Activo')
        )
        
        # Link users if provided
        user_ids = data.get('user_ids', [])
        if user_ids:
            users = User.query.filter(User.id.in_(user_ids)).all()
            new_area.area_users = users
            
        db.session.add(new_area)
        
        # Crear Carpeta Física del Área en el Root Storage
        try:
            area_path = StorageManager.get_safe_path(name)
            if not os.path.exists(area_path):
                os.makedirs(area_path, exist_ok=True)
        except Exception as e:
            current_app.logger.error(f"Error creando carpeta física para área {name}: {e}")
        
        # Audit Log
        log = AuditLog(
            user=current_user.email,
            action='Alta',
            module='Áreas',
            target=name,
            detail=f"Nueva área creada: {name}",
            status='success'
        )
        db.session.add(log)
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Área creada correctamente'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding area: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@areas_bp.route('/edit/<int:area_id>', methods=['POST'])
@login_required
@admin_required
def edit_area(area_id):
    try:
        area = Area.query.get_or_404(area_id)
        data = request.get_json()
        
        # Check name uniqueness if changed
        new_name = data.get('name')
        if new_name != area.name and Area.query.filter_by(name=new_name).first():
            return jsonify({'status': 'error', 'message': 'El nombre del área ya existe'}), 400
            
        # Gestionar cambio de nombre físico (Renombrado de Carpeta)
        old_name = area.name
        if new_name != old_name:
            try:
                old_path = StorageManager.get_safe_path(old_name)
                new_path = StorageManager.get_safe_path(new_name)
                
                if os.path.exists(old_path):
                    os.rename(old_path, new_path)
                elif not os.path.exists(new_path):
                    os.makedirs(new_path, exist_ok=True)
                
                # Actualizar storage_path de todas las plataformas del área
                for p in area.platforms:
                    p.storage_path = os.path.join(new_name, p.name)
            except Exception as e:
                current_app.logger.error(f"Error al renombrar carpeta de área {old_name} a {new_name}: {e}")

        area.name = new_name
        area.description = data.get('description')
        area.icon = data.get('icon')
        area.color = data.get('color')
        area.status = data.get('status')
        
        # Update users (optional in this route now)
        user_ids = data.get('user_ids')
        if user_ids is not None:
            users = User.query.filter(User.id.in_(user_ids)).all()
            area.area_users = users
        
        # Audit Log
        log = AuditLog(
            user=current_user.email,
            action='Modificación',
            module='Áreas',
            target=area.name,
            detail=f"Área actualizada: {area.name}",
            status='success'
        )
        db.session.add(log)
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Área actualizada correctamente'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error editing area: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@areas_bp.route('/delete/<int:area_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_area(area_id):
    try:
        area = Area.query.get_or_404(area_id)
        area_name = area.name
        
        # Check if platforms are linked
        if area.platforms:
             return jsonify({'status': 'error', 'message': 'No se puede eliminar el área porque tiene plataformas vinculadas'}), 400
             
        db.session.delete(area)
        
        # Audit Log
        log = AuditLog(
            user=current_user.email,
            action='Baja',
            module='Áreas',
            target=area_name,
            detail=f"Área eliminada: {area_name}",
            status='success'
        )
        db.session.add(log)
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Área eliminada correctamente'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting area: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@areas_bp.route('/delete-bulk', methods=['POST'])
@login_required
@admin_required
def delete_areas_bulk():
    try:
        data = request.get_json()
        ids = data.get('ids', [])
        if not ids:
            return jsonify({'status': 'error', 'message': 'No se proporcionaron IDs'}), 400
            
        areas = Area.query.filter(Area.id.in_(ids)).all()
        
        # Check for dependencies first
        restricted_areas = [a.name for a in areas if a.platforms]
        if restricted_areas:
            names = ", ".join(restricted_areas)
            return jsonify({
                'status': 'error', 
                'message': f'No se pueden eliminar las siguientes áreas porque tienen plataformas vinculadas: {names}. Primero debes eliminar o reasignar sus plataformas.'
            }), 400
            
        deleted_count = 0
        for area in areas:
            area_name = area.name
            db.session.delete(area)
            
            log = AuditLog(
                user=current_user.email,
                action='Baja',
                module='Áreas',
                target=area_name,
                detail=f"Área eliminada (Bulk): {area_name}",
                status='success'
            )
            db.session.add(log)
            deleted_count += 1
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': f'{deleted_count} áreas eliminadas correctamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500

@areas_bp.route('/users/<int:area_id>')
@login_required
@admin_required
def get_area_users(area_id):
    try:
        area = Area.query.get_or_404(area_id)
        selected_ids = [u.id for u in area.area_users]
        return jsonify({'status': 'success', 'selected_ids': selected_ids})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
@areas_bp.route('/users/update/<int:area_id>', methods=['POST'])
@login_required
@admin_required
def update_area_users(area_id):
    try:
        area = Area.query.get_or_404(area_id)
        data = request.get_json()
        user_ids = data.get('user_ids', [])
        
        users = User.query.filter(User.id.in_(user_ids)).all()
        area.area_users = users
        
        # Audit Log
        log = AuditLog(
            user=current_user.email,
            action='Modificación',
            module='Accesos',
            target=area.name,
            detail=f"Accesos de usuarios actualizados para el área: {area.name}",
            status='success'
        )
        db.session.add(log)
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Accesos actualizados correctamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
