from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from app.decorators import admin_required
from app.modules.core.models import Area, Platform
from app.modules.auth.models import User
from app.modules.audit.models import AuditLog
from app.modules.drive.utils import SecretManager, StorageManager, log_drive_activity
import os
import json

drive_platforms_bp = Blueprint('drive_platforms', __name__, url_prefix='/admin/drive-platforms')

@drive_platforms_bp.route('/')
@login_required
@admin_required
def index():
    # Only drive units (platforms with storage_path)
    drive_units = Platform.query.filter(Platform.storage_path.isnot(None)).all()
    areas = Area.query.all()
    users = User.query.filter_by(is_active=True).all()
    
    # Data structure for the JS catalog
    grouped_platforms = {}
    for a in areas:
        area_units = [u for u in drive_units if u.area_id == a.id]
        grouped_platforms[a.id] = [{
            'id': u.id,
            'name': u.name,
            'description': u.description,
            'icon': u.icon or 'hdd',
            'storage_path': u.storage_path,
            'can_download': u.can_download,
            'can_upload': u.can_upload,
            'can_delete': u.can_delete,
            'is_encrypted': u.is_encrypted,
            'status': u.status,
            'users_count': u.platform_users.count() if hasattr(u.platform_users, 'count') else len(u.platform_users)
        } for u in area_units]
        
    area_list = [{
        'id': a.id,
        'name': a.name,
        'description': a.description,
        'icon': a.icon or 'sitemap',
        'color': a.color or '#6366f1',
        'status': a.status or 'Activo'
    } for a in areas]
    
    all_users = [{
        'id': u.id,
        'name': u.nombre or u.email,
        'email': u.email
    } for u in users]
    
    return render_template('drive_platforms_v2.html', 
                           grouped_platforms=grouped_platforms,
                           area_list=area_list,
                           all_users=all_users)

@drive_platforms_bp.route('/add', methods=['POST'])
@login_required
@admin_required
def add_unit():
    try:
        data = request.form
        name = data.get('name')
        area_id = data.get('area_id')
        
        area = Area.query.get(area_id)
        if not area:
            return jsonify({'success': False, 'error': 'Área no válida'}), 400
            
        # Saneamiento de nombre para seguridad de archivos
        safe_name = StorageManager.sanitize_filename(name)
        
        # Generar storage_path automático
        storage_path = os.path.join(area.name, safe_name)
        
        new_unit = Platform(
            name=safe_name,
            description=data.get('description'),
            area_id=area_id,
            storage_path=storage_path,
            icon=data.get('icon', 'fa-folder'),
            can_download=data.get('can_download') == 'true',
            can_upload=data.get('can_upload') == 'true',
            can_delete=data.get('can_delete') == 'true',
            is_encrypted=data.get('is_encrypted') == 'true',
            status='Activo'
        )
        
        password = data.get('password')
        if password and new_unit.is_encrypted:
            new_unit.password = SecretManager.encrypt(password)
            
        # Crear Carpeta Física
        try:
            full_path = StorageManager.get_safe_path(storage_path)
            if not os.path.exists(full_path):
                os.makedirs(full_path, exist_ok=True)
        except Exception as e:
            current_app.logger.error(f"Error creando directorio de drive: {e}")

        db.session.add(new_unit)
        db.session.flush()

        # Asignar Usuarios
        user_ids = data.get('users')
        if user_ids:
            ids = json.loads(user_ids)
            users = User.query.filter(User.id.in_(ids)).all()
            new_unit.platform_users = users

        # Log
        log = AuditLog(
            user=current_user.email,
            action='Alta',
            module='Drive Units',
            target=name,
            detail=f"Nueva unidad de Drive creada: {name}",
            status='success'
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Unidad de Drive creada correctamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@drive_platforms_bp.route('/edit/<int:unit_id>', methods=['POST'])
@login_required
@admin_required
def edit_unit(unit_id):
    try:
        unit = Platform.query.get_or_404(unit_id)
        data = request.form
        
        unit.name = data.get('name')
        unit.description = data.get('description')
        unit.area_id = data.get('area_id')
        unit.icon = data.get('icon', 'fa-folder')
        unit.can_download = data.get('can_download') == 'true'
        unit.can_upload = data.get('can_upload') == 'true'
        unit.can_delete = data.get('can_delete') == 'true'
        unit.is_encrypted = data.get('is_encrypted') == 'true'
        
        password = data.get('password')
        if password and unit.is_encrypted:
            unit.password = SecretManager.encrypt(password)
            
        # Actualizar storage_path y gestionar cambio físico si es necesario
        old_storage_path = unit.storage_path
        area = Area.query.get(unit.area_id)
        if area:
            new_storage_path = os.path.join(area.name, unit.name)
            if new_storage_path != old_storage_path:
                try:
                    old_full = StorageManager.get_safe_path(old_storage_path)
                    new_full = StorageManager.get_safe_path(new_storage_path)
                    
                    if os.path.exists(old_full):
                        os.rename(old_full, new_full)
                    elif not os.path.exists(new_full):
                        os.makedirs(new_full, exist_ok=True)
                    
                    unit.storage_path = new_storage_path
                except Exception as e:
                    current_app.logger.error(f"Error renombrando plataforma física de {old_storage_path} a {new_storage_path}: {e}")

        # Asignar Usuarios
        user_ids = data.get('users')
        if user_ids:
            ids = json.loads(user_ids)
            users = User.query.filter(User.id.in_(ids)).all()
            unit.platform_users = users

        db.session.commit()
        return jsonify({'success': True, 'message': 'Unidad actualizada correctamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@drive_platforms_bp.route('/delete/<int:unit_id>', methods=['POST'])
@login_required
@admin_required
def delete_unit(unit_id):
    try:
        unit = Platform.query.get_or_404(unit_id)
        # Nota: No borramos la carpeta física por seguridad (solo el registro)
        db.session.delete(unit)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
@drive_platforms_bp.route('/api/list/<int:area_id>')
@login_required
@admin_required
def list_units_api(area_id):
    try:
        units = Platform.query.filter_by(area_id=area_id).filter(Platform.storage_path.isnot(None)).all()
        data = [{
            'id': u.id,
            'name': u.name,
            'description': u.description,
            'icon': u.icon or 'hdd',
            'storage_path': u.storage_path,
            'can_download': u.can_download,
            'can_upload': u.can_upload,
            'can_delete': u.can_delete,
            'is_encrypted': u.is_encrypted,
            'status': u.status,
            'users_count': u.platform_users.count() if hasattr(u.platform_users, 'count') else len(u.platform_users)
        } for u in units]
        return jsonify({'success': True, 'platforms': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
