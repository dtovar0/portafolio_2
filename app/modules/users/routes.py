from flask import Blueprint, render_template, request, jsonify, g
from flask_login import login_required, current_user
from app.decorators import admin_required
from app import db
from app.modules.auth.models import User, AuthConfig
from app.modules.core.models import Area, Platform, AccessRequest
from app.modules.audit.models import AuditLog
from app.modules.audit.services import add_audit_log
import json
from datetime import datetime
import ssl
from ldap3 import Server, Connection, ALL, Tls

users_bp = Blueprint('users_module', __name__, url_prefix='/admin')

@users_bp.route('/users')
@login_required
@admin_required
def users_list():
    users = User.query.all()
    areas = Area.query.all()
    
    # Pre-calculate data for JS to avoid too many filters in template
    # Adapt to model names: name -> nombre, status -> is_active
    users_data = []
    for u in users:
        # Get count of approved access requests for this user email
        platforms_count = AccessRequest.query.filter_by(user_email=u.email, status='Aprobado').count()
        
        users_data.append({
            'id': u.id,
            'name': u.nombre or u.email,
            'email': u.email,
            'role': u.role,
            'status': 'Activo' if u.is_active else 'Inactivo',
            'platforms_count': platforms_count,
            'areas': [{'id': a.id, 'name': a.name, 'icon': a.icon, 'color': a.color} for a in u.areas] if hasattr(u, 'areas') else []
        })
        
    areas_data = [a.to_dict() for a in areas]
    
    return render_template('users.html', 
                         users_json=users_data, 
                         all_areas_json=areas_data)

@users_bp.route('/areas-api')
@login_required
@admin_required
def areas_api():
    areas = Area.query.all()
    return jsonify([a.to_dict() for a in areas])

@users_bp.route('/add-user', methods=['POST'])
@login_required
@admin_required
def add_user():
    try:
        # FormData in users.js
        nombre = request.form.get('name')
        email = request.form.get('email')
        role = request.form.get('role', 'usuario')
        password = request.form.get('password', 'nexus123') # Default if not provided
        status_str = request.form.get('status', 'Activo')
        areas_json = request.form.get('areas', '[]')
        
        if User.query.filter_by(email=email).first():
            return jsonify({"success": False, "error": "El correo ya está registrado."}), 409

        new_user = User(
            nombre=nombre,
            email=email,
            role=role,
            is_active=(status_str == 'Activo'),
            auth_source='local'
        )
        new_user.set_password(password)
        
        # Link Areas
        area_names = json.loads(areas_json)
        selected_areas = Area.query.filter(Area.name.in_(area_names)).all()
        new_user.areas = selected_areas
        
        db.session.add(new_user)
        db.session.commit()
        
        add_audit_log(f"CREAR USUARIO: {email}", status="success", detail=f"Usuario {nombre} creado manualmente")
        
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@users_bp.route('/edit-user/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def edit_user(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "error": "Usuario no encontrado"}), 404
            
        role = request.form.get('role')
        status_str = request.form.get('status')
        areas_json = request.form.get('areas', '[]')
        
        if role: user.role = role
        if status_str: user.is_active = (status_str == 'Activo')
        
        # Update Areas
        area_names = json.loads(areas_json)
        selected_areas = Area.query.filter(Area.name.in_(area_names)).all()
        user.areas = selected_areas
        
        db.session.commit()
        
        add_audit_log(f"MODIFICAR USUARIO: {user.email}", status="success", detail=f"Perfil de usuario actualizado")
        
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@users_bp.route('/delete-user/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def delete_user(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "error": "Usuario no encontrado"}), 404
            
        if user.id == current_user.id:
            return jsonify({"success": False, "error": "No puedes eliminar tu propia cuenta"}), 400
            
        email = user.email
        db.session.delete(user)
        db.session.commit()
        
        add_audit_log(f"ELIMINAR USUARIO: {email}", status="warning", detail=f"Usuario eliminado del sistema")
        
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@users_bp.route('/user-access/<int:user_id>')
@login_required
@admin_required
def user_access(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "error": "Usuario no encontrado"}), 404
            
        platforms = Platform.query.all()
        # In current models, AccessRequest is linked via user_email
        user_requests = AccessRequest.query.filter_by(user_email=user.email, status='Aprobado').all()
        approved_platform_ids = [r.platform_id for r in user_requests]
        
        platforms_data = []
        for p in platforms:
            d = p.to_dict()
            d['has_access'] = (p.id in approved_platform_ids)
            d['area_name'] = p.area.name if p.area else 'General'
            platforms_data.append(d)
            
        return jsonify({
            "success": True,
            "user": user.nombre or user.email,
            "platforms": platforms_data
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@users_bp.route('/update-user-access/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def update_user_access(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "error": "Usuario no encontrado"}), 404
            
        data = request.get_json()
        new_platform_ids = data.get('platform_ids', [])
        
        # Get current approved platforms for this user
        current_reqs = AccessRequest.query.filter_by(user_email=user.email, status='Aprobado').all()
        current_ids = [r.platform_id for r in current_reqs]
        
        # Remove ones not in new list
        for r in current_reqs:
            if r.platform_id not in new_platform_ids:
                db.session.delete(r)
        
        # Add new ones
        for pid in new_platform_ids:
            if pid not in current_ids:
                new_req = AccessRequest(
                    platform_id=pid,
                    user_email=user.email,
                    status='Aprobado',
                    processed_at=datetime.now()
                )
                db.session.add(new_req)
                
        db.session.commit()
        add_audit_log(f"ACTUALIZAR ACCESOS: {user.email}", status="success", detail=f"Accesos a plataformas actualizados (IDs: {new_platform_ids})")
        
        return jsonify({"success": True, "message": "Accesos actualizados correctamente"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@users_bp.route('/ldap-search-api')
@login_required
@admin_required
def ldap_search_api():
    query = request.args.get('q', '')
    if not query:
        return jsonify({"success": False, "error": "Faltan criterios de búsqueda"}), 400
        
    config = AuthConfig.query.first()
    if not config or not config.ldap_host:
        return jsonify({"success": False, "error": "LDAP no configurated"}), 400
        
    try:
        tls_config = None
        if config.ldap_ssl:
            tls_config = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)

        server = Server(
            config.ldap_host, 
            port=int(config.ldap_port), 
            use_ssl=config.ldap_ssl, 
            tls=tls_config,
            connect_timeout=5
        )

        user_filter = f"(|(sAMAccountName=*{query}*)(mail=*{query}*)(displayName=*{query}*))"
        
        with Connection(server, user=config.ldap_user, password=config.ldap_pass, auto_bind=True, auto_referrals=False) as conn:
            conn.search(config.ldap_base_dn, user_filter, attributes=['mail', 'displayName', 'cn', 'sAMAccountName', 'uid'])
            
            users = []
            for entry in conn.entries:
                users.append({
                    "displayName": str(entry.displayName.value) if 'displayName' in entry else (str(entry.cn.value) if 'cn' in entry else ''),
                    "mail": str(entry.mail.value) if 'mail' in entry else '',
                    "sAMAccountName": str(entry.sAMAccountName.value) if 'sAMAccountName' in entry else (str(entry.uid.value) if 'uid' in entry else ''),
                    "cn": str(entry.cn.value) if 'cn' in entry else ''
                })
                
            return jsonify({"success": True, "users": users})
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
