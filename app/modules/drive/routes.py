from flask import Blueprint, render_template, redirect, url_for, current_app, jsonify, request
from flask_login import login_required, current_user
from app.modules.core.models import Area, Platform
from app.modules.auth.models import User
from app import db

drive_bp = Blueprint('drive', __name__, url_prefix='/drive')

@drive_bp.route('/')
@login_required
def index():
    try:
        # In Nexus v8 we use current_user from flask_login
        user = current_user
        
        if user.role == 'administrador':
            all_areas = Area.query.order_by(Area.name).all()
            approved_platforms = Platform.query.all()
        else:
            # En Nexus v8, las áreas y plataformas se asocian al usuario
            # Si no hay relación directa, mostramos las activas por defecto o según lógica de negocio
            all_areas = Area.query.filter_by(status='Activo').order_by(Area.name).all()
            approved_platforms = Platform.query.filter_by(status='Activo').all()
            
        return render_template('drive.html', 
                               all_areas=all_areas, 
                               approved_platforms=approved_platforms,
                               platforms_json=[p.to_dict() for p in approved_platforms])
    except Exception as e:
        current_app.logger.error(f"Error en Drive Index: {e}")
        return render_template('errors/500.html'), 500

@drive_bp.route('/api/files')
@login_required
def get_files():
    """API para obtener archivos de una plataforma (Simulada para integración inicial)"""
    try:
        platform_id = request.args.get('platform_id')
        # Aquí iría la lógica de conexión a S3, FTP o Local Storage
        # Por ahora devolvemos un estado vacío para que la UI de Nexus lo maneje
        return jsonify({
            "status": "success",
            "files": [],
            "path": "/"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
