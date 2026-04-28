import sys
import os

# Añadir el directorio raíz al path para importar la app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.modules.core.models import Area, Platform, AccessRequest
from app.modules.audit.models import AuditLog
from datetime import datetime, timedelta
import random

def seed_demo_data():
    app = create_app()
    with app.app_context():
        print("🌱 Iniciando Generador de Datos Premium...")

        # 1. Áreas
        areas_data = [
            {'name': 'Innovación Digital', 'icon': 'fa-lightbulb', 'color': '#6366f1'},
            {'name': 'Ciberseguridad', 'icon': 'fa-shield-halved', 'color': '#ef4444'},
            {'name': 'Operaciones Cloud', 'icon': 'fa-cloud', 'color': '#3b82f6'},
            {'name': 'Inteligencia de Negocios', 'icon': 'fa-chart-line', 'color': '#10b981'},
            {'name': 'Soporte Táctico', 'icon': 'fa-headset', 'color': '#f59e0b'}
        ]

        inserted_areas = []
        for a in areas_data:
            existing = Area.query.filter_by(name=a['name']).first()
            if not existing:
                area = Area(name=a['name'], icon=a['icon'], color=a['color'], description=f"Departamento de {a['name']}")
                db.session.add(area)
                inserted_areas.append(area)
                print(f"✅ Área creada: {a['name']}")
            else:
                inserted_areas.append(existing)

        db.session.commit()

        # 2. Plataformas
        platforms_data = [
            {'name': 'AWS Production', 'area_idx': 2, 'visits': 1250, 'icon': 'fa-server'},
            {'name': 'Azure Quantum', 'area_idx': 2, 'visits': 840, 'icon': 'fa-atom'},
            {'name': 'Nexus Core Engine', 'area_idx': 0, 'visits': 2100, 'icon': 'fa-microchip'},
            {'name': 'ServiceNow Ops', 'area_idx': 4, 'visits': 450, 'icon': 'fa-ticket-alt'},
            {'name': 'Datadog Monitoring', 'area_idx': 2, 'visits': 1800, 'icon': 'fa-dog'},
            {'name': 'Tableau Analytics', 'area_idx': 3, 'visits': 600, 'icon': 'fa-chart-pie'},
            {'name': 'Vault Security', 'area_idx': 1, 'visits': 300, 'icon': 'fa-vault'}
        ]

        inserted_platforms = []
        for p in platforms_data:
            existing = Platform.query.filter_by(name=p['name']).first()
            if not existing:
                area = inserted_areas[p['area_idx']]
                platform = Platform(
                    name=p['name'],
                    description=f"Plataforma principal para {p['name']}",
                    area_id=area.id,
                    visits=p['visits'],
                    icon=p['icon'],
                    bg_color=area.color
                )
                db.session.add(platform)
                inserted_platforms.append(platform)
                print(f"✅ Plataforma creada: {p['name']}")
            else:
                inserted_platforms.append(existing)

        db.session.commit()

        # 3. Solicitudes Pendientes
        emails = ['sarah.chen@nexus.ai', 'marco.rosso@nexus.ai', 'alex.novak@compliance.org']
        for _ in range(12):
            plat = random.choice(inserted_platforms)
            req = AccessRequest(
                platform_id=plat.id,
                user_email=random.choice(emails),
                status='Pendiente',
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72))
            )
            db.session.add(req)
        
        print(f"✅ 12 Solicitudes demo creadas.")

        # 4. Logs de Auditoría
        actions = ['Alta', 'Modificación', 'Activación', 'Aprobado']
        entities = ['AWS Production', 'Sarah Chen', 'Área: Ciberseguridad', 'Portal Settings']
        
        for i in range(15):
            log = AuditLog(
                user='admin@nexus.ai',
                action=random.choice(actions),
                target=random.choice(entities),
                description=f"Acción automática de generación de datos demo #{i}",
                timestamp=datetime.utcnow() - timedelta(minutes=random.randint(1, 1440))
            )
            db.session.add(log)

        db.session.commit()
        print("\n✨ Base de Datos poblada con éxito para validación.")

if __name__ == "__main__":
    seed_demo_data()
