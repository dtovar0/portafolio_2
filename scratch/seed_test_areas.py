import os
import sys

# Añadir el directorio raíz al path para importar la app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.modules.core.models import Area

app = create_app()

with app.app_context():
    test_areas = [
        {"name": "Recursos Humanos", "description": "Gestión de talento, nómina y beneficios corporativos.", "icon": "users", "color": "#ec4899"},
        {"name": "Finanzas & Tesorería", "description": "Control presupuestario, auditoría y flujos de caja.", "icon": "chart", "color": "#f59e0b"},
        {"name": "Ventas & CRM", "description": "Seguimiento de leads, cierre de tratos y gestión de clientes.", "icon": "briefcase", "color": "#10b981"},
        {"name": "Marketing Digital", "description": "Campañas, redes sociales y análisis de impacto de marca.", "icon": "bolt", "color": "#8b5cf6"},
        {"name": "Logística & Supply", "description": "Cadena de suministro, inventarios y distribución global.", "icon": "box", "color": "#3b82f6"},
        {"name": "Soporte Técnico", "description": "Atención al cliente, tickets y resolución de incidentes.", "icon": "tool", "color": "#06b6d4"},
        {"name": "Legal & Compliance", "description": "Contratos, normativas y cumplimiento regulatorio.", "icon": "shield", "color": "#64748b"},
        {"name": "I+D Innovación", "description": "Investigación, desarrollo y prototipado de nuevos productos.", "icon": "rocket", "color": "#f43f5e"}
    ]

    for area_data in test_areas:
        # Evitar duplicados por nombre
        existing = Area.query.filter_by(name=area_data['name']).first()
        if not existing:
            new_area = Area(
                name=area_data['name'],
                description=area_data['description'],
                icon=area_data['icon'],
                color=area_data['color'],
                status='Activo'
            )
            db.session.add(new_area)
            print(f"Área creada: {area_data['name']}")
        else:
            print(f"El área ya existe: {area_data['name']}")
    
    db.session.commit()
    print("\nProceso finalizado. 8 áreas de prueba añadidas correctamente.")
