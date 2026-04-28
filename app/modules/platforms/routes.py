from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from app.decorators import admin_required
from app.modules.core.models import Area, Platform
from app.modules.auth.models import User
from app.modules.audit.models import AuditLog
import os

platforms_bp = Blueprint('platforms_module', __name__, url_prefix='/admin/platforms')

@platforms_bp.route('/')
@login_required
@admin_required
def platforms_list():
    platforms = Platform.query.all()
    areas = Area.query.filter_by(status='Activo').all()
    users = User.query.filter_by(is_active=True).all()
    
    # Adapt data for JS
    platforms_data = []
    for p in platforms:
        platforms_data.append({
            'id': p.id,
            'name': p.name,
            'description': p.description,
            'area_id': p.area_id,
            'area_name': p.area.name if p.area else 'N/A',
            'direct_link': p.direct_link,
            'icon': p.icon,
            'status': p.status,
            'users_count': p.users.count() if hasattr(p, 'users') else 0 # Assuming M2M or relationship exists
        })
        
    areas_data = [{'id': a.id, 'name': a.name} for a in areas]
    users_data = [{'id': u.id, 'name': u.nombre or u.email, 'email': u.email} for u in users]
    
    return render_template('platforms.html', 
                         platforms_json=platforms_data, 
                         areas=areas,
                         users_json=users_data)

@platforms_bp.route('/add', methods=['POST'])
@login_required
@admin_required
def add_platform():
    try:
        data = request.get_json()
        name = data.get('name')
        
        new_platform = Platform(
            name=name,
            description=data.get('description'),
            area_id=data.get('area_id'),
            direct_link=data.get('direct_link'),
            icon=data.get('icon', 'box'),
            status=data.get('status', 'Activo')
        )
        
        db.session.add(new_platform)
        
        # Audit Log
        log = AuditLog(
            user=current_user.email,
            action='Alta',
            module='Plataformas',
            target=name,
            description=f"Nueva plataforma creada: {name}",
            status='success'
        )
        db.session.add(log)
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Plataforma creada correctamente'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding platform: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@platforms_bp.route('/edit/<int:platform_id>', methods=['POST'])
@login_required
@admin_required
def edit_platform(platform_id):
    try:
        platform = Platform.query.get_or_404(platform_id)
        data = request.get_json()
        
        platform.name = data.get('name')
        platform.description = data.get('description')
        platform.area_id = data.get('area_id')
        platform.direct_link = data.get('direct_link')
        platform.icon = data.get('icon')
        platform.status = data.get('status')
        
        # Audit Log
        log = AuditLog(
            user=current_user.email,
            action='Modificación',
            module='Plataformas',
            target=platform.name,
            description=f"Plataforma actualizada: {platform.name}",
            status='success'
        )
        db.session.add(log)
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Plataforma actualizada correctamente'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error editing platform: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@platforms_bp.route('/delete/<int:platform_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_platform(platform_id):
    try:
        platform = Platform.query.get_or_404(platform_id)
        platform_name = platform.name
        
        db.session.delete(platform)
        
        # Audit Log
        log = AuditLog(
            user=current_user.email,
            action='Baja',
            module='Plataformas',
            target=platform_name,
            description=f"Plataforma eliminada: {platform_name}",
            status='success'
        )
        db.session.add(log)
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Plataforma eliminada correctamente'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting platform: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@platforms_bp.route('/delete-bulk', methods=['POST'])
@login_required
@admin_required
def delete_platforms_bulk():
    try:
        data = request.get_json()
        ids = data.get('ids', [])
        if not ids:
            return jsonify({'status': 'error', 'message': 'No se proporcionaron IDs'}), 400
            
        platforms = Platform.query.filter(Platform.id.in_(ids)).all()
        for p in platforms:
            platform_name = p.name
            db.session.delete(p)
            
            log = AuditLog(
                user=current_user.email,
                action='Baja',
                module='Plataformas',
                target=platform_name,
                description=f"Plataforma eliminada (Bulk): {platform_name}",
                status='success'
            )
            db.session.add(log)
            
        db.session.commit()
        return jsonify({'status': 'success', 'message': f'{len(platforms)} plataformas eliminadas correctamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
