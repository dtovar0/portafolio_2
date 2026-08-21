from flask import Blueprint, jsonify, current_app
from flask import redirect
from flask_login import login_required, current_user
from app.authz import is_admin, is_area_admin, scoped_users
from .models import AuditLog

audit_bp = Blueprint('audit', __name__, url_prefix='/audit')


def _frontend(path):
    """URL del frontend Next.js, que sirve ahora esta vista."""
    import os
    return (os.getenv('FRONTEND_URL', '') or '') + path


@audit_bp.route('/')
@login_required
def index():
    try:
        return redirect(_frontend('/audit'))
    except Exception as e:
        current_app.logger.error(f"Error en audit.index: {e}")
        return jsonify({'status': 'error',
                        'message': 'No se pudo cargar la auditoría.'}), 500

@audit_bp.route('/api/list')
@login_required
def list_audit():
    try:
        # El superadmin ve todo; un admin de área, los registros de los
        # usuarios de sus áreas; un usuario, solo los propios.
        if is_admin():
            query = AuditLog.query
        elif is_area_admin():
            emails = [u.email for u in scoped_users().all()]
            query = AuditLog.query.filter(AuditLog.user.in_(emails))
        else:
            query = AuditLog.query.filter_by(user=current_user.email)

        logs = query.order_by(AuditLog.timestamp.desc()).limit(500).all()
        
        return jsonify({
            "status": "success",
            "logs": [log.to_dict() for log in logs]
        })
    except Exception as e:
        current_app.logger.error(f"Error en list_audit: {e}")
        return jsonify({"status": "error", "message": "No se pudo obtener el historial de auditoría"}), 500
