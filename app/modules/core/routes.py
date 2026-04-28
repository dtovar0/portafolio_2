from flask import Blueprint, render_template, send_from_directory, current_app, jsonify

from flask_login import login_required, current_user
from app import db
from app.decorators import admin_required
from app.modules.audit.models import AuditLog
from app.modules.core.models import Area, Platform, AccessRequest
import os



core_bp = Blueprint("core", __name__, url_prefix="/")

@core_bp.route("/")
@login_required
def index():
    # Role-based Redirection
    if current_user.role != 'administrador':
        return redirect(url_for('core.portal'))
        
    try:
        from flask import request
        page = request.args.get('page', 1, type=int)
        
        # 1. Stats Summary
        from app.modules.auth.models import User
        from app.modules.core.models import Area, Platform, AccessRequest
        
        areas_count = Area.query.count()
        platforms_total = Platform.query.count()
        users_total = User.query.count()
        pending_total = AccessRequest.query.filter_by(status='Pendiente').count()
        visits_total = db.session.query(db.func.sum(Platform.visits)).scalar() or 0

        # 2. Chart Data: Users per Platform
        platforms = Platform.query.all()
        up_labels = [p.name for p in platforms[:5]]
        up_values = [p.users_count if hasattr(p, 'users_count') else 0 for p in platforms[:5]]

        # 3. Chart Data: Users per Area
        areas = Area.query.all()
        ua_labels = [a.name for a in areas[:5]]
        ua_values = [len(a.users) if hasattr(a, 'users') else 0 for a in areas[:5]]
        ua_colors = [a.color or '#6366f1' for a in areas[:5]]

        # 4. Chart Data: Most Visited
        most_visited = Platform.query.order_by(Platform.visits.desc()).limit(5).all()
        
        # 5. Activity Log
        subq = db.session.query(AuditLog.id).filter_by(user=current_user.email)\
                                            .order_by(AuditLog.timestamp.desc()).limit(20).subquery()
        pagination = AuditLog.query.filter(AuditLog.id.in_(db.session.query(subq)))\
                                   .order_by(AuditLog.timestamp.desc())\
                                   .paginate(page=page, per_page=10, error_out=False)
                                   
        return render_template("index.html", 
                             activity=pagination.items, 
                             pagination=pagination,
                             areas_count_num=areas_count,
                             total=platforms_total,
                             total_users=users_total,
                             pending=pending_total,
                             visits_total=visits_total,
                             users_platform_labels=up_labels,
                             users_platform_values=up_values,
                             users_area_labels=ua_labels,
                             users_area_values=ua_values,
                             users_area_colors=ua_colors,
                             pending_platform_labels=[], # Placeholder for now
                             pending_platform_values=[], # Placeholder for now
                             most_visited=most_visited,
                             log_list=pagination.items) # Alias for log_list in template
    except Exception as e:
        current_app.logger.error(f"Error en index: {e}")
        return render_template("index.html", activity=[], pagination=None, 
                             areas_count_num=0, total=0, total_users=0, pending=0, visits_total=0,
                             users_platform_labels=[], users_platform_values=[],
                             users_area_labels=[], users_area_values=[], users_area_colors=[],
                             pending_platform_labels=[], pending_platform_values=[],
                             most_visited=[], log_list=[])

@core_bp.route("/dashboard-2")
@login_required
@admin_required
def dashboard_2():
    try:
        from flask import request
        page = request.args.get('page', 1, type=int)
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        
        # Vista Táctica: Últimos 20 logs únicamente, divididos en 2 páginas de 10
        subq = db.session.query(AuditLog.id).order_by(AuditLog.timestamp.desc()).limit(20).subquery()
        pagination = AuditLog.query.filter(AuditLog.id.in_(db.session.query(subq))).order_by(AuditLog.timestamp.desc()).paginate(page=page, per_page=10, error_out=False)
            
        return render_template("dashboard_2.html", 
                               activity=pagination.items, 
                               pagination=pagination)
    except Exception as e:
        current_app.logger.error(f"Error en dashboard_2: {e}")
        return "Internal Error", 500



@core_bp.route('/assets/<path:filename>')
def serve_assets(filename):
    """Handler oficial de assets migrado al Core Blueprint"""
    try:
        return send_from_directory(os.path.join(current_app.root_path, '../assets'), filename)
    except Exception as e:
        current_app.logger.error(f"Error sirviendo asset {filename}: {e}")
        return "Asset not found", 404

@core_bp.route("/api/stats")
@login_required
def get_stats():
    """
    Generic API to provide dashboard metrics based on AuditLogs and System state.
    """
    from app.modules.audit.models import AuditLog
    from app.modules.auth.models import User
    from datetime import datetime, timedelta
    
    try:
        # 1. Basic Counts
        total_logs = AuditLog.query.count()
        total_users = User.query.filter_by(is_active=True).count()
        
        # 2. Critical/Error logs (Alertas)
        critical_alerts = AuditLog.query.filter(AuditLog.status.in_(['error', 'fail', 'warning'])).count()
        
        # 3. Simple volume breakdown (Today vs yesterday)
        today = datetime.now().date()
        logs_today = AuditLog.query.filter(db.func.date(AuditLog.timestamp) == today).count()
        
        # 4. Activity chart data (last 7 days simple count)
        last_7_days = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            count = AuditLog.query.filter(db.func.date(AuditLog.timestamp) == day).count()
            last_7_days.append({"day": day.strftime('%d/%m'), "count": count})

        return jsonify({
            "status": "success",
            "stats": {
                "total_events": total_logs,
                "critical_alerts": critical_alerts,
                "active_users": total_users,
                "volume_today": logs_today,
                "history": last_7_days
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@core_bp.route("/ayuda")

@login_required
def help_page():
    try:
        return render_template("help.html")
    except Exception as e:
        current_app.logger.error(f"Error en help: {e}")
        return "Internal Error", 500


@core_bp.route("/portal")
@login_required
def portal():
    try:
        platforms_list = Platform.query.all()
        areas_list = Area.query.all()
        return render_template("portal.html", platforms=platforms_list, areas=areas_list)
    except Exception as e:
        current_app.logger.error(f"Error en portal: {e}")
        return "Internal Error", 500


