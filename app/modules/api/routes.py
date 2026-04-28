from flask import Blueprint, jsonify, request
from app.modules.api.decorators import api_key_required
from app import db

api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

@api_bp.route('/status', methods=['GET'])
@api_key_required
def get_status():
    """
    Health check publico para la API
    """
    return jsonify({
        "status": "online",
        "version": "1.0.0",
        "message": "NEXUS API Táctica activa y protegida"
    })

@api_bp.route('/echo', methods=['POST'])
@api_key_required
def echo():
    """
    Endpoint de prueba para validar payloads
    """
    data = request.json
    return jsonify({
        "status": "success",
        "received": data
    })
