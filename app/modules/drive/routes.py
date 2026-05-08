from flask import Blueprint, render_template, redirect, url_for, current_app, jsonify, request, send_file
from flask_login import login_required, current_user
from app.modules.core.models import Area, Platform, DriveActivity, StorageStat
from app.modules.auth.models import User
from app import db
from .utils import StorageManager, SecretManager, log_drive_activity
import os
import math
from datetime import datetime

drive_bp = Blueprint('drive', __name__, url_prefix='/drive')

def _resolve_platform_access(path):
    if current_user.role.lower() == 'administrador':
        allowed_platforms = Platform.query.all()
    else:
        # El usuario tiene acceso a todas las plataformas de sus áreas asignadas
        area_ids = [a.id for a in current_user.areas]
        allowed_platforms = Platform.query.filter(Platform.area_id.in_(area_ids)).all()
    
    # Normalizar el path solicitado
    norm_path = os.path.normpath(path)
    
    for p in allowed_platforms:
        # Resolver el path físico de la plataforma
        p_path = StorageManager.get_safe_path(p.storage_path or p.name)
        if norm_path.startswith(p_path):
            return p
    
    # Si no tiene acceso a ninguna y no es admin, fuera.
    if current_user.role.lower() != 'administrador':
        raise PermissionError('No tienes acceso a esta ubicación.')
    return None

def _validate_platform_password(target_platform, password):
    if target_platform and target_platform.is_encrypted and target_platform.password:
        decrypted_pass = SecretManager.decrypt(target_platform.password)
        if password != decrypted_pass:
            raise PermissionError('Contraseña incorrecta')

def _resolve_area_root(path):
    for area in Area.query.all():
        area_path = StorageManager.get_safe_path(area.name)
        if path == area_path:
            return area
    return None

def _ensure_not_area_root_action(path, action_label):
    area = _resolve_area_root(path)
    if area:
        raise PermissionError(f'No puedes {action_label} directamente en la raíz del área "{area.name}".')

@drive_bp.route('/')
@login_required
def index():
    return redirect(url_for('drive.dashboard'))

@drive_bp.route('/dashboard')
@login_required
def dashboard():
    try:
        user = current_user
        if user.role.lower() == 'administrador':
            approved_areas = Area.query.order_by(Area.name).all()
            total_platforms = Platform.query.count()
            total_users = User.query.count()
        else:
            approved_areas = [a for a in user.areas if a.status == 'Activo']
            area_ids = [a.id for a in approved_areas]
            total_platforms = Platform.query.filter(Platform.area_id.in_(area_ids)).count()
            total_users = 1 # El usuario mismo
            
        # Recent activity (Strictly filtered by current user for this dashboard)
        recent_activity = DriveActivity.query.filter_by(user_id=user.id)\
                                     .order_by(DriveActivity.created_at.desc())\
                                     .limit(20).all()

        # --- TELEMETRÍA PERSONALIZADA (SOLO USUARIO) ---
        from sqlalchemy import func, case
        from datetime import timedelta
        from app.modules.auth.models import user_platforms, user_areas
        
        # 0. Definir alcances del usuario
        user_area_ids = [a.id for a in user.areas]
        user_platform_ids = [p.id for p in user.platforms]

        # 1. Distribución de Plataformas (Filtrado por mis plataformas)
        # Nota: Aquí mostramos visitas o algo similar si no hay otros usuarios, 
        # pero seguiremos la estructura de 'distribución' solicitada.
        up_stats = db.session.query(
            Platform.name, 
            func.count(DriveActivity.id).label('actividad')
        ).join(DriveActivity, Platform.id == DriveActivity.platform_id)\
         .filter(DriveActivity.user_id == user.id)\
         .group_by(Platform.id).all()
        
        up_labels = [p[0] for p in up_stats]
        up_values = [int(p[1]) for p in up_stats]

        # 2. Distribución de Áreas (Mis Plataformas por Área)
        area_stats_raw = db.session.query(
            Area.name,
            func.count(func.distinct(Platform.id)).label('p_count'),
            func.count(func.distinct(DriveActivity.id)).label('activity_count')
        ).join(Platform, Area.id == Platform.area_id)\
         .outerjoin(DriveActivity, Platform.id == DriveActivity.platform_id)\
         .filter(Platform.id.in_(user_platform_ids))\
         .group_by(Area.id).all()
        
        ua_labels = [r[0] for r in area_stats_raw]
        ua_platforms = [int(r[1]) for r in area_stats_raw]
        ua_activity = [int(r[2]) for r in area_stats_raw]

        # 3. Tráfico Personal (Inbound vs Outbound)
        traffic_raw = db.session.query(
            Platform.name,
            func.sum(case((DriveActivity.action == 'Alta', DriveActivity.file_size), else_=0)).label('up'),
            func.sum(case((DriveActivity.action == 'Descarga', DriveActivity.file_size), else_=0)).label('down')
        ).join(DriveActivity, Platform.id == DriveActivity.platform_id)\
         .filter(DriveActivity.user_id == user.id)\
         .group_by(Platform.id).all()

        t_labels = [r[0] for r in traffic_raw]
        t_up = [float(r[1] or 0) for r in traffic_raw]
        t_down = [float(r[2] or 0) for r in traffic_raw]

        # KPIs de Tráfico para los Cards
        total_in_bytes = sum(t_up)
        total_out_bytes = sum(t_down)

        def format_bytes_local(size_bytes):
            if size_bytes == 0: return "0 B"
            units = ("B", "KB", "MB", "GB", "TB")
            i = int(math.floor(math.log(size_bytes, 1024)))
            p = math.pow(1024, i)
            s = round(size_bytes / p, 2)
            return f"{s} {units[i]}"

        user_traffic_in = format_bytes_local(total_in_bytes)
        user_traffic_out = format_bytes_local(total_out_bytes)

        # 4. Tendencia Personal (7 Días)
        today = datetime.now()
        dates = [(today - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(6, -1, -1)]
        
        trend_raw = db.session.query(
            func.date(DriveActivity.created_at).label('date'),
            func.sum(case((DriveActivity.action == 'Alta', DriveActivity.file_size), else_=0)).label('up'),
            func.sum(case((DriveActivity.action == 'Descarga', DriveActivity.file_size), else_=0)).label('down')
        ).filter(DriveActivity.user_id == user.id)\
         .filter(DriveActivity.created_at >= (today - timedelta(days=7)))\
         .group_by(func.date(DriveActivity.created_at)).all()

        trend_map = {r[0].strftime('%Y-%m-%d') if hasattr(r[0], 'strftime') else str(r[0]): (float(r[1] or 0), float(r[2] or 0)) for r in trend_raw}
        
        trend_dates = [d[5:10].replace('-', '/') for d in dates]
        trend_up = [trend_map.get(d, (0, 0))[0] for d in dates]
        trend_down = [trend_map.get(d, (0, 0))[1] for d in dates]

        telemetry = {
            'up': {'l': up_labels, 'v': up_values},
            'ua': {'l': ua_labels, 'up': ua_platforms, 'uu': ua_activity}, # Cambiamos uu por actividad para simetría
            't': {'l': t_labels, 'up': t_up, 'down': t_down},
            'trend': {'l': trend_dates, 'up': trend_up, 'down': trend_down}
        }
            
        return render_template('drive_dashboard.html', 
                               approved_areas=approved_areas,
                               total_platforms=total_platforms,
                               user_traffic_in=user_traffic_in,
                               user_traffic_out=user_traffic_out,
                               recent_activity=recent_activity,
                               telemetry=telemetry)
    except Exception as e:
        current_app.logger.error(f"Error en Drive Dashboard: {e}")
        return render_template('errors/500.html'), 500

@drive_bp.route('/explorer')
@login_required
def explorer():
    try:
        user = current_user
        if user.role.lower() == 'administrador':
            approved_areas = Area.query.order_by(Area.name).all()
            approved_platforms = Platform.query.filter(Platform.storage_path.isnot(None)).all()
            print(f"DEBUG EXPLORER: Admin detectado. Plataformas con path: {len(approved_platforms)}")
        else:
            approved_areas = [a for a in user.areas if a.status == 'Activo']
            area_ids = [a.id for a in approved_areas]
            approved_platforms = Platform.query.filter(Platform.area_id.in_(area_ids)).filter(Platform.storage_path.isnot(None)).all()
            print(f"DEBUG EXPLORER: Usuario detectado. Áreas: {len(approved_areas)}, Plataformas: {len(approved_platforms)}")

        fav_ids = [f.id for f in current_user.favorites]
        p_json = []
        for p in approved_platforms:
            try:
                d = p.to_dict()
                d['is_favorite'] = p.id in fav_ids
                p_json.append(d)
            except Exception as e:
                print(f"DEBUG EXPLORER: Error en to_dict de {p.name}: {e}")

        return render_template('drive.html', 
                               approved_areas=approved_areas, 
                               approved_platforms=approved_platforms,
                               platforms_json=p_json)
    except Exception as e:
        current_app.logger.error(f"Error en Drive Explorer: {e}")
        return render_template('errors/500.html'), 500

@drive_bp.route('/favorites')
@login_required
def favorites():
    fav_platforms = current_user.favorites
    p_json = []
    for p in fav_platforms:
        try:
            d = p.to_dict()
            d['is_favorite'] = True
            p_json.append(d)
        except Exception as e:
            print(f"Error serializando favorito: {e}")
            
    return render_template('drive_favorites.html', 
                           favorites=fav_platforms,
                           platforms_json=p_json)

@drive_bp.route('/api/favorites/toggle', methods=['POST'])
@login_required
def toggle_favorite():
    try:
        data = request.get_json()
        platform_id = data.get('platform_id')
        platform = Platform.query.get_or_404(platform_id)
        
        from app import db
        if platform in current_user.favorites:
            current_user.favorites.remove(platform)
            status = 'removed'
        else:
            current_user.favorites.append(platform)
            status = 'added'
            
        db.session.commit()
        return jsonify({'success': True, 'status': status})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@drive_bp.route('/api/drive/list', methods=['GET', 'POST'])
@login_required
def list_files_api():
    try:
        data = (request.is_json and request.get_json()) or {}
        requested_path = data.get('path') or request.args.get('path') or ''
        
        if not requested_path or requested_path in ['', '/']:
            platforms = Platform.query.order_by(Platform.name).all() if current_user.role.lower() == 'administrador' else current_user.platforms
            if platforms:
                requested_path = platforms[0].storage_path or platforms[0].name
            else:
                return jsonify({'success': False, 'error': 'No tienes accesos activos.'}), 403

        path = StorageManager.get_safe_path(requested_path)
        
        if not os.path.exists(path):
            try: os.makedirs(path, exist_ok=True)
            except: return jsonify({'success': False, 'error': f'Ruta inaccesible: {requested_path}'}), 404
            
        target_platform = _resolve_platform_access(path)
        area_root = _resolve_area_root(path)

        def get_human_size(size_bytes):
            if size_bytes == 0: return "0 B"
            units = ("B", "KB", "MB", "GB", "TB")
            i = int(math.floor(math.log(size_bytes, 1024)))
            p = math.pow(1024, i)
            s = round(size_bytes / p, 2)
            return f"{s} {units[i]}"

        items = []
        for entry in os.scandir(path):
            if entry.name == '.nexus_lock': continue
            try:
                stats = entry.stat()
                items.append({
                    'name': entry.name,
                    'is_dir': entry.is_dir(),
                    'size': get_human_size(stats.st_size) if not entry.is_dir() else '--',
                    'mtime': stats.st_mtime,
                    'ctime': stats.st_ctime,
                    'path': requested_path.rstrip('/') + '/' + entry.name
                })
            except: continue 
        
        items.sort(key=lambda x: (not x['is_dir'], x['name'].lower()))
        
        return jsonify({
            'success': True,
            'items': items,
            'protected': target_platform.is_encrypted if target_platform else False,
            'current_path': requested_path,
            'permissions': {
                'can_download': target_platform.can_download if target_platform else True,
                'can_upload': target_platform.can_upload if target_platform else True
            },
            'context': {
                'kind': 'area_root' if area_root and not target_platform else 'platform',
                'area_name': area_root.name if area_root else None
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@drive_bp.route('/api/v8/upload', methods=['POST'])
@login_required
def upload_files_v8():
    try:
        # Check multiple possible field names for resilience
        files = request.files.getlist('file') or request.files.getlist('files[]') or request.files.getlist('files')
        path_str = request.form.get('path', '/')
        password = request.form.get('password')

        if not files:
            return jsonify({'success': False, 'error': 'No se recibieron archivos'}), 400
            
        dest_dir = StorageManager.get_safe_path(path_str)
        _ensure_not_area_root_action(dest_dir, 'subir archivos')
        target_platform = _resolve_platform_access(dest_dir)
        
        if target_platform:
            if not target_platform.can_upload:
                return jsonify({'success': False, 'error': 'Subidas deshabilitadas para esta ubicación'}), 403
            _validate_platform_password(target_platform, password)

        results = []
        for file in files:
            if not StorageManager.is_safe_file(file.filename):
                results.append({'name': file.filename, 'status': 'error', 'error': 'Extensión prohibida'})
                continue
                
            safe_filename = StorageManager.sanitize_filename(file.filename)
            full_path = os.path.join(dest_dir, safe_filename)
            
            if os.path.exists(full_path):
                results.append({'name': file.filename, 'status': 'error', 'error': 'El archivo ya existe'})
                continue

            file.save(full_path)
            file_size = os.path.getsize(full_path)
            area_id = target_platform.area_id if target_platform else None
            platform_id = target_platform.id if target_platform else None
            log_drive_activity(safe_filename, path_str, 'Alta', current_user.id, file_size, area_id, platform_id)
            results.append({'name': safe_filename, 'status': 'success'})

        return jsonify({'success': True, 'results': results, 'message': 'Subida completada exitosamente'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@drive_bp.route('/api/download', methods=['GET', 'POST'])
@login_required
def download_file():
    try:
        if request.method == 'POST':
            data = request.get_json() or {}
            requested_path = data.get('path')
            password = data.get('password')
        else:
            requested_path = request.args.get('path')
            password = request.args.get('password')

        path = StorageManager.get_safe_path(requested_path)
        if not os.path.exists(path):
            return "Archivo no encontrado", 404

        target_platform = _resolve_platform_access(path)
        if target_platform:
            if not target_platform.can_download:
                return "Descargas deshabilitadas", 403
            _validate_platform_password(target_platform, password)

        file_size = os.path.getsize(path)
        area_id = target_platform.area_id if target_platform else None
        platform_id = target_platform.id if target_platform else None
        log_drive_activity(os.path.basename(path), requested_path, 'Descarga', current_user.id, file_size, area_id, platform_id)

        return send_file(path, as_attachment=True)
    except Exception as e:
        return str(e), 500

@drive_bp.route('/api/delete-item', methods=['POST'])
@login_required
def delete_item():
    try:
        data = request.get_json() or {}
        path = StorageManager.get_safe_path(data.get('path'))
        password = data.get('password')
        
        target_platform = _resolve_platform_access(path)
        _validate_platform_password(target_platform, password)
            
        if os.path.isdir(path):
            import shutil
            shutil.rmtree(path)
        else:
            os.remove(path)
        
        log_drive_activity(os.path.basename(path), os.path.dirname(path), 'Baja', current_user.id, 0, target_platform.area_id if target_platform else None, target_platform.id if target_platform else None)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@drive_bp.route('/api/create-folder', methods=['POST'])
@login_required
def create_folder():
    try:
        data = request.get_json() or {}
        base_path_str = data.get('path')
        folder_name = data.get('name')
        password = data.get('password')
        
        if not folder_name:
            return jsonify({'success': False, 'error': 'Nombre de carpeta requerido'}), 400
            
        base_path = StorageManager.get_safe_path(base_path_str)
        _ensure_not_area_root_action(base_path, 'crear carpetas')
        
        target_platform = _resolve_platform_access(base_path)
        _validate_platform_password(target_platform, password)
        
        sanitized_name = StorageManager.sanitize_filename(folder_name)
        new_folder_path = os.path.join(base_path, sanitized_name)
        
        if os.path.exists(new_folder_path):
            return jsonify({'success': False, 'error': 'La carpeta ya existe'}), 409
            
        os.makedirs(new_folder_path, exist_ok=True)
        
        area_id = target_platform.area_id if target_platform else None
        platform_id = target_platform.id if target_platform else None
        log_drive_activity(sanitized_name, base_path_str, 'Carpeta', current_user.id, 0, area_id, platform_id)
        
        return jsonify({
            'success': True, 
            'message': 'Carpeta creada', 
            'was_sanitized': folder_name != sanitized_name,
            'sanitized_name': sanitized_name
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@drive_bp.route('/api/download-folder', methods=['POST'])
@login_required
def download_folder_zip():
    try:
        data = request.get_json() or {}
        requested_path = data.get('path')
        password = data.get('password')

        path = StorageManager.get_safe_path(requested_path)
        if not os.path.exists(path) or not os.path.isdir(path):
            return jsonify({'success': False, 'error': 'Carpeta no encontrada'}), 404

        _ensure_not_area_root_action(path, 'descargar')
        target_platform = _resolve_platform_access(path)
        _validate_platform_password(target_platform, password)
        
        folder_name = os.path.basename(path)
        import tempfile
        import shutil
        
        # Crear archivo temporal
        tmp_fd, tmp_path = tempfile.mkstemp()
        os.close(tmp_fd)
        
        try:
            # zip_path tendrá la extensión .zip agregada por make_archive
            zip_path = shutil.make_archive(tmp_path, 'zip', path)
            
            zip_size = os.path.getsize(zip_path)
            area_id = target_platform.area_id if target_platform else None
            platform_id = target_platform.id if target_platform else None
            log_drive_activity(f"{folder_name}.zip", requested_path, 'Descarga', current_user.id, zip_size, area_id, platform_id)

            return send_file(zip_path, as_attachment=True, download_name=f"{folder_name}.zip")
        finally:
            # Nota: El archivo temporal debería eliminarse después de enviarse, 
            # pero Flask requiere que el archivo exista durante el streaming.
            # Podríamos usar un after_this_request para limpiar.
            pass
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@drive_bp.route('/api/drive/stats')
@login_required
def get_drive_stats():
    try:
        # KPIs
        areas_count = Area.query.count() if current_user.role.lower() == 'administrador' else len(current_user.areas)
        plats_count = Platform.query.count() if current_user.role.lower() == 'administrador' else len(current_user.platforms)
        
        base_query = DriveActivity.query
        if current_user.role.lower() != 'administrador':
            base_query = base_query.filter_by(user_id=current_user.id)

        downloads_count = base_query.filter_by(action='Descarga').count()
        uploads_count = base_query.filter(DriveActivity.action.in_(['Alta', 'Carga'])).count()

        return jsonify({
            'success': True, 
            'kpis': {
                'areas': areas_count,
                'platforms': plats_count,
                'downloads': downloads_count,
                'uploads': uploads_count
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@drive_bp.route('/api/drive/logs')
@login_required
def get_drive_logs():
    try:
        base_query = DriveActivity.query
        if current_user.role.lower() != 'administrador':
            base_query = base_query.filter_by(user_id=current_user.id)
            
        logs = base_query.order_by(DriveActivity.created_at.desc()).limit(10).all()
        
        return jsonify({
            'success': True, 
            'logs': [{
                'id': l.id,
                'user_name': l.user.nombre if l.user else 'Sistema',
                'target_name': l.file_name,
                'action': l.action,
                'created_at': l.created_at.strftime('%H:%M:%S')
            } for l in logs]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
