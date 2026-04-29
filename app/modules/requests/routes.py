from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from app.decorators import admin_required
from app.modules.core.models import AccessRequest, Platform
from app.modules.auth.models import User
from app.modules.audit.models import AuditLog
from datetime import datetime

requests_bp = Blueprint('requests_module', __name__, url_prefix='/admin/requests')

@requests_bp.route('/')
@login_required
@admin_required
def requests_list():
    all_requests = AccessRequest.query.order_by(AccessRequest.created_at.desc()).all()
    
    # Calculate counts
    counts = {
        'total': len(all_requests),
        'pending': len([r for r in all_requests if r.status == 'Pendiente']),
        'approved': len([r for r in all_requests if r.status == 'Aprobado']),
        'rejected': len([r for r in all_requests if r.status in ['Rechazado', 'Denegado']])
    }
    
    # Adapt data for JS
    requests_data = []
    for r in all_requests:
        # Find user by email (as defined in our model)
        user = User.query.filter_by(email=r.user_email).first()
        requests_data.append({
            'id': r.id,
            'user_name': user.nombre if user else r.user_email,
            'user_email': r.user_email,
            'platform_name': r.platform.name if r.platform else 'N/A',
            'area_name': r.platform.area.name if r.platform and r.platform.area else 'N/A',
            'status': r.status,
            'created_at': r.created_at.strftime('%Y-%m-%d %H:%M'),
            'processed_at': r.processed_at.strftime('%Y-%m-%d %H:%M') if r.processed_at else '-'
        })
    
    return render_template('requests.html', 
                         requests_json=requests_data, 
                         counts=counts)

@requests_bp.route('/process', methods=['POST'])
@login_required
@admin_required
def process_request():
    try:
        data = request.get_json()
        request_ids = data.get('ids', [])
        action = data.get('action') # 'approve' or 'reject'
        
        status = 'Aprobado' if action == 'approve' else 'Rechazado'
        
        updated_count = 0
        for rid in request_ids:
            req = AccessRequest.query.get(rid)
            if req and req.status == 'Pendiente':
                req.status = status
                req.processed_at = datetime.now()
                
                # EFFECTIVE ACCESS GRANT: Link user to platform AND its Area
                if action == 'approve':
                    user = User.query.filter_by(email=req.user_email).first()
                    if user and req.platform:
                        # 1. Link to the specific platform
                        if req.platform not in user.platforms:
                            user.platforms.append(req.platform)
                        
                        # 2. Link to the Area (REQUIRED for visibility in Portal)
                        if req.platform.area and req.platform.area not in user.areas:
                            user.areas.append(req.platform.area)
                
                # Audit Log
                log = AuditLog(
                    user=current_user.email,
                    action='Procesamiento',
                    module='Solicitudes',
                    target=f"ID {rid}",
                    description=f"Solicitud {status} para {req.user_email} en {req.platform.name}",
                    status='success'
                )
                db.session.add(log)
                updated_count += 1
                
        db.session.commit()
        return jsonify({
            'status': 'success', 
            'message': f'{updated_count} solicitudes procesadas como {status}'
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error processing requests: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@requests_bp.route('/submit', methods=['POST'])
@login_required
def submit_request():
    try:
        data = request.get_json()
        platform_id = data.get('platform_id')
        
        if not platform_id:
            return jsonify({'status': 'error', 'message': 'Falta platform_id'}), 400
            
        # Check if already exists
        existing = AccessRequest.query.filter_by(platform_id=platform_id, user_email=current_user.email, status='Pendiente').first()
        if existing:
            return jsonify({'status': 'error', 'message': 'Ya tienes una solicitud pendiente para esta plataforma'}), 400
            
        new_req = AccessRequest(
            platform_id=platform_id,
            user_email=current_user.email
        )
        db.session.add(new_req)
        
        # Audit Log
        platform = Platform.query.get(platform_id)
        log = AuditLog(
            user=current_user.email,
            action='Solicitud',
            module='Solicitudes',
            target=platform.name if platform else f"ID {platform_id}",
            description=f"Usuario solicitó acceso a {platform.name if platform else platform_id}",
            status='success'
        )
        db.session.add(log)
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Solicitud enviada correctamente'})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error submitting request: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
