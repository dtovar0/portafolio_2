"""
API v1 — configuración del sistema.

Todo aquí es exclusivo del superadmin: identidad del portal, SMTP, plantillas
de correo y LDAP. Un admin de área administra su tenant, no el sistema.
"""

import json

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app import db
from app.authz import admin_required
from app.modules.audit.services import add_audit_log
from app.modules.auth.models import AuthConfig
from app.modules.notifications.models import (InAppNotification,
                                              NotificationTemplate, SMTPConfig)
from app.modules.settings.models import SystemConfig

admin_bp = Blueprint('api_admin', __name__, url_prefix='/api/v1')


def _payload():
    return request.get_json(silent=True) or {}


def _error(message, status=400):
    return jsonify({'status': 'error', 'message': message}), status


# --------------------------------------------------------------------------- #
# Identidad del portal
# --------------------------------------------------------------------------- #

@admin_bp.route('/settings')
@login_required
def get_settings():
    """La identidad del portal la lee cualquiera: la interfaz la necesita."""
    config = SystemConfig.query.first()
    if config is None:
        return jsonify(SystemConfig().to_dict())
    return jsonify(config.to_dict())


@admin_bp.route('/settings', methods=['PUT'])
@login_required
@admin_required
def save_settings():
    config = SystemConfig.query.first()
    if config is None:
        config = SystemConfig()
        db.session.add(config)

    data = _payload()
    for field in ('portal_name', 'portal_identity_type', 'portal_icon',
                  'bg_color', 'text_color'):
        if field in data:
            setattr(config, field, data[field])

    db.session.commit()
    add_audit_log('ACTUALIZAR CONFIGURACIÓN', module='Ajustes',
                  status='success')
    return jsonify({'status': 'success', 'settings': config.to_dict()})


# --------------------------------------------------------------------------- #
# SMTP
# --------------------------------------------------------------------------- #

@admin_bp.route('/smtp')
@login_required
@admin_required
def get_smtp():
    config = SMTPConfig.query.first()
    # to_dict() omite la contraseña a propósito.
    return jsonify(config.to_dict() if config else SMTPConfig().to_dict())


@admin_bp.route('/smtp', methods=['PUT'])
@login_required
@admin_required
def save_smtp():
    config = SMTPConfig.query.first()
    if config is None:
        config = SMTPConfig()
        db.session.add(config)

    data = _payload()
    for field in ('server', 'encryption', 'username', 'sender_name'):
        if field in data:
            setattr(config, field, data[field])
    if 'port' in data:
        try:
            config.port = int(data['port'])
        except (TypeError, ValueError):
            return _error('Puerto no válido.')
    if 'auth_enabled' in data:
        config.auth_enabled = bool(data['auth_enabled'])
    # Una contraseña vacía no borra la guardada.
    if data.get('password'):
        config.password = data['password']

    db.session.commit()
    add_audit_log('ACTUALIZAR SMTP', module='Notificaciones', status='success')
    return jsonify({'status': 'success', 'smtp': config.to_dict()})


@admin_bp.route('/smtp/test', methods=['POST'])
@login_required
@admin_required
def test_smtp():
    """Envía un correo de prueba al destinatario indicado."""
    recipient = (_payload().get('email') or current_user.email or '').strip()
    if not recipient or '@' not in recipient:
        return _error('Indica un correo de destino válido.')

    config = SMTPConfig.query.first()
    if config is None:
        return _error('Configura primero el servidor SMTP.')

    try:
        from app.modules.notifications.services import send_test_email
        # Se prueba con lo guardado, salvo que el payload traiga otros valores
        # (permite validar antes de guardar).
        data = _payload()
        result = send_test_email(
            server=data.get('server') or config.server,
            port=int(data.get('port') or config.port),
            encryption=data.get('encryption') or config.encryption,
            username=data.get('username') or config.username,
            password=data.get('password') or config.password,
            sender_name=data.get('sender_name') or config.sender_name,
            target_email=recipient,
        )
        if isinstance(result, dict) and result.get('status') == 'error':
            add_audit_log('PRUEBA SMTP', module='Notificaciones',
                          status='error', detail=str(result.get('message'))[:200])
            return jsonify(result), 502
    except Exception as exc:
        add_audit_log('PRUEBA SMTP', module='Notificaciones', status='error',
                      detail=str(exc))
        return _error(f'No se pudo enviar: {exc}', 502)

    add_audit_log('PRUEBA SMTP', module='Notificaciones', status='success',
                  detail=f'Destinatario: {recipient}')
    return jsonify({'status': 'success'})


# --------------------------------------------------------------------------- #
# Plantillas de correo
# --------------------------------------------------------------------------- #

@admin_bp.route('/templates')
@login_required
@admin_required
def list_templates():
    templates = NotificationTemplate.query.order_by(
        NotificationTemplate.name).all()
    return jsonify([t.to_dict() for t in templates])


@admin_bp.route('/templates/<slug>', methods=['PUT'])
@login_required
@admin_required
def save_template(slug):
    template = NotificationTemplate.query.filter_by(slug=slug).first()
    data = _payload()

    if template is None:
        if not data.get('name') or not data.get('subject'):
            return _error('Nombre y asunto son obligatorios.')
        template = NotificationTemplate(slug=slug, name=data['name'],
                                        subject=data['subject'],
                                        body=data.get('body') or '')
        db.session.add(template)
    else:
        for field in ('name', 'subject', 'body'):
            if field in data:
                setattr(template, field, data[field])
    if 'is_html' in data:
        template.is_html = bool(data['is_html'])

    db.session.commit()
    add_audit_log(f'GUARDAR PLANTILLA: {slug}', module='Notificaciones',
                  target=slug, status='success')
    return jsonify({'status': 'success', 'template': template.to_dict()})


# --------------------------------------------------------------------------- #
# Notificaciones in-app
# --------------------------------------------------------------------------- #

@admin_bp.route('/notifications')
@login_required
def list_notifications():
    """Notificaciones del usuario, más las globales."""
    if not current_user.pref_notifications:
        return jsonify([])

    items = (InAppNotification.query
             .filter(db.or_(InAppNotification.user_id == current_user.id,
                            InAppNotification.user_id.is_(None)))
             .order_by(InAppNotification.created_at.desc())
             .limit(50).all())
    return jsonify([n.to_dict() for n in items])


@admin_bp.route('/notifications/read', methods=['POST'])
@login_required
def mark_notifications_read():
    """Marca como leídas: todas las propias, o las indicadas."""
    ids = _payload().get('ids')
    query = InAppNotification.query.filter(
        db.or_(InAppNotification.user_id == current_user.id,
               InAppNotification.user_id.is_(None)))
    if ids:
        query = query.filter(InAppNotification.id.in_(ids))
    query.update({'is_read': True}, synchronize_session=False)
    db.session.commit()
    return jsonify({'status': 'success'})


@admin_bp.route('/notifications', methods=['DELETE'])
@login_required
def delete_notifications():
    """Elimina las notificaciones propias; las globales no se tocan."""
    InAppNotification.query.filter_by(user_id=current_user.id).delete(
        synchronize_session=False)
    db.session.commit()
    return jsonify({'status': 'success'})


# --------------------------------------------------------------------------- #
# LDAP
# --------------------------------------------------------------------------- #

@admin_bp.route('/auth-config')
@login_required
@admin_required
def get_auth_config():
    config = AuthConfig.query.first()
    # to_dict() omite ldap_pass a propósito.
    return jsonify(config.to_dict() if config else AuthConfig().to_dict())


@admin_bp.route('/auth-config', methods=['PUT'])
@login_required
@admin_required
def save_auth_config():
    config = AuthConfig.query.first()
    if config is None:
        config = AuthConfig()
        db.session.add(config)

    data = _payload()
    for field in ('ldap_host', 'ldap_base_dn', 'ldap_user', 'ldap_user_attr',
                  'ldap_group_admin', 'ldap_group_user'):
        if field in data:
            setattr(config, field, data[field])
    if 'ldap_port' in data:
        try:
            config.ldap_port = int(data['ldap_port'])
        except (TypeError, ValueError):
            return _error('Puerto no válido.')
    if 'ldap_ssl' in data:
        config.ldap_ssl = bool(data['ldap_ssl'])
    if data.get('ldap_pass'):
        config.ldap_pass = data['ldap_pass']
    if 'ldap_role_mappings' in data:
        mappings = data['ldap_role_mappings']
        config.ldap_role_mappings = (
            mappings if isinstance(mappings, str) else json.dumps(mappings))

    db.session.commit()
    add_audit_log('ACTUALIZAR CONFIGURACIÓN LDAP', module='Seguridad',
                  status='success')
    return jsonify({'status': 'success', 'config': config.to_dict()})


@admin_bp.route('/auth-config/test', methods=['POST'])
@login_required
@admin_required
def test_auth_config():
    """Comprueba la conexión con el directorio."""
    from app.modules.auth.services import validate_ldap_connection

    # Se prueban los valores del payload si vienen, para poder validar antes de
    # guardar; si no, lo que ya está configurado.
    data = _payload()
    config = AuthConfig.query.first()
    if config is None and not data:
        return _error('No hay configuración de directorio.')

    try:
        result = validate_ldap_connection(
            host=data.get('ldap_host') or (config.ldap_host if config else None),
            port=int(data.get('ldap_port') or (config.ldap_port if config else 389)),
            use_ssl=data.get('ldap_ssl', config.ldap_ssl if config else False),
            bind_dn=data.get('ldap_user') or (config.ldap_user if config else None),
            bind_pass=data.get('ldap_pass') or (config.ldap_pass if config else None),
        )
    except Exception as exc:
        return _error(f'Error al conectar: {exc}', 502)

    ok = (result or {}).get('status') == 'success'
    add_audit_log('PRUEBA LDAP', module='Seguridad',
                  status='success' if ok else 'error',
                  detail=str((result or {}).get('message'))[:200])
    return jsonify(result), (200 if ok else 502)
