from flask import Blueprint, render_template, send_from_directory, current_app, jsonify, redirect, url_for
from flask_login import login_required, current_user
from app import db
from app.decorators import admin_required
from app.modules.audit.models import AuditLog
from app.modules.core.models import Area, Platform
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
        
        areas_count = Area.query.count()
        platforms_total = Platform.query.count()
        users_total = User.query.count()
        
        visits_total = db.session.query(db.func.sum(Platform.visits)).scalar() or 0

        # Traffic Stats (In/Out)
        from app.modules.core.models import DriveActivity
        t_in_bytes = db.session.query(db.func.sum(DriveActivity.file_size)).filter(DriveActivity.action == 'Alta').scalar() or 0
        t_out_bytes = db.session.query(db.func.sum(DriveActivity.file_size)).filter(DriveActivity.action == 'Descarga').scalar() or 0

        def format_size(size):
            if size is None: return "0.0 B"
            size = float(size)
            for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
                if size < 1024.0:
                    return f"{size:.1f} {unit}"
                size /= 1024.0
            return f"{size:.1f} PB"

        traffic_in = format_size(t_in_bytes)
        traffic_out = format_size(t_out_bytes)

        # 2. Chart Data: Users per Platform (Top 5)
        from app.modules.auth.models import user_platforms
        platforms_with_user_counts = db.session.query(
            Platform.name, 
            db.func.count(user_platforms.c.user_id).label('user_count')
        ).join(user_platforms, Platform.id == user_platforms.c.platform_id)\
         .group_by(Platform.id)\
         .order_by(db.desc('user_count'))\
         .limit(5).all()
        
        up_labels = [p[0] for p in platforms_with_user_counts]
        up_values = [int(p[1]) for p in platforms_with_user_counts]
        
        if not up_labels:
            up_labels = [p.name for p in Platform.query.limit(5).all()]
            up_values = [0] * len(up_labels)

        # 3. Chart Data: Areas Population (Top 5 by Users)
        from app.modules.auth.models import user_areas
        areas_stats = db.session.query(
            Area.name,
            db.func.count(db.distinct(Platform.id)).label('platform_count'),
            db.func.count(db.distinct(user_areas.c.user_id)).label('user_count')
        ).outerjoin(Platform, Area.id == Platform.area_id)\
         .outerjoin(user_areas, Area.id == user_areas.c.area_id)\
         .group_by(Area.id)\
         .order_by(db.desc('user_count'))\
         .limit(5).all()

        ua_labels = [a[0] for a in areas_stats]
        ua_platforms = [int(a[1]) for a in areas_stats]
        ua_users = [int(a[2]) for a in areas_stats]

        if not ua_labels:
            ua_labels = [a.name for a in Area.query.limit(5).all()]
            ua_platforms = [0] * len(ua_labels)
            ua_users = [0] * len(ua_labels)

        # 4. Chart Data: Platform Traffic (Top 5 by Volume)
        from app.modules.core.models import DriveActivity
        traffic_stats = db.session.query(
            Platform.name,
            db.func.sum(db.case((DriveActivity.action == 'Alta', DriveActivity.file_size), else_=0)).label('traffic_in'),
            db.func.sum(db.case((DriveActivity.action == 'Descarga', DriveActivity.file_size), else_=0)).label('traffic_out')
        ).join(DriveActivity, Platform.id == DriveActivity.platform_id)\
         .group_by(Platform.id)\
         .order_by(db.desc(db.func.sum(DriveActivity.file_size)))\
         .limit(5).all()

        mv_labels = [p[0] for p in traffic_stats]
        mv_in = [int(p[1] or 0) for p in traffic_stats] # RAW BYTES
        mv_out = [int(p[2] or 0) for p in traffic_stats] # RAW BYTES

        if not mv_labels:
            mv_labels = [p.name for p in Platform.query.limit(5).all()]
            mv_in = [0] * len(mv_labels)
            mv_out = [0] * len(mv_labels)
        
        # 5. Chart Data: 7-Day Traffic Trend
        from datetime import datetime, timedelta
        end_date = datetime.now()
        start_date = end_date - timedelta(days=6)
        
        dates_list = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
        labels_7d = [(start_date + timedelta(days=i)).strftime('%d/%m') for i in range(7)]
        
        trend_stats = db.session.query(
            db.func.date(DriveActivity.created_at).label('date'),
            db.func.sum(db.case((DriveActivity.action == 'Alta', DriveActivity.file_size), else_=0)).label('traffic_in'),
            db.func.sum(db.case((DriveActivity.action == 'Descarga', DriveActivity.file_size), else_=0)).label('traffic_out')
        ).filter(DriveActivity.created_at >= start_date.replace(hour=0, minute=0, second=0))\
         .group_by(db.func.date(DriveActivity.created_at)).all()
        
        trend_map = {str(s[0]): (s[1], s[2]) for s in trend_stats}
        
        v_in_7d = []
        v_out_7d = []
        for d in dates_list:
            vals = trend_map.get(d, (0, 0))
            v_in_7d.append(int(vals[0] or 0)) # RAW BYTES
            v_out_7d.append(int(vals[1] or 0)) # RAW BYTES

        # 6. Activity Log
        subq = db.session.query(AuditLog.id).order_by(AuditLog.timestamp.desc()).limit(20).subquery()
        pagination = AuditLog.query.filter(AuditLog.id.in_(db.session.query(subq)))\
                             .order_by(AuditLog.timestamp.desc()).paginate(page=page, per_page=10)

        return render_template("index.html", 
                             areas_count_num=areas_count,
                             total=platforms_total,
                             total_users=users_total,
                             visits_total=visits_total,
                             traffic_in=traffic_in,
                             traffic_out=traffic_out,
                             users_platform_labels=up_labels,
                             users_platform_values=up_values,
                             users_area_labels=ua_labels,
                             users_area_platforms=ua_platforms,
                             users_area_users=ua_users,
                             traffic_mv_labels=mv_labels,
                             traffic_mv_in=mv_in,
                             traffic_mv_out=mv_out,
                             trend_labels=labels_7d,
                             trend_in=v_in_7d,
                             trend_out=v_out_7d,
                             log_list=pagination.items)
                             
    except Exception as e:
        current_app.logger.error(f"Error en index: {e}")
        return render_template("index.html", activity=[], pagination=None, 
                             areas_count_num=0, total=0, total_users=0, visits_total=0,
                             users_platform_labels=[], users_platform_values=[],
                             users_area_labels=[], users_area_values=[], users_area_colors=[],
                             most_visited=[], log_list=[])

@core_bp.route("/portal")
@login_required
def portal():
    """Vista de Catálogo redirigida al módulo oficial de Drive"""
    return redirect(url_for('drive.index'))

@core_bp.route("/dashboard-2")
@login_required
@admin_required
def dashboard_2():
    # Keep original or sync similarly if needed
    return redirect(url_for('core.index'))

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
    # Simple API for real-time updates if needed
    return jsonify({"status": "ok"})
