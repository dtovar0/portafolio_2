import sys
import os
import random
from datetime import datetime, timedelta

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.modules.core.models import Area, Platform, DriveActivity
from app.modules.auth.models import User

def generate_demo():
    app = create_app()
    with app.app_context():
        print("🚀 Iniciando generación de datos demo para Nexus Drive...")
        
        # 1. Limpiar datos previos si se desea (opcional, aquí solo añadiremos)
        # DriveActivity.query.delete()
        # db.session.commit()

        # 2. Asegurar existencia de Áreas
        areas = Area.query.all()
        if not areas:
            print("📦 Creando áreas...")
            areas = [
                Area(name="Infraestructura", color="#8b5cf6", icon="server"),
                Area(name="Desarrollo", color="#10b981", icon="code"),
                Area(name="Ciberseguridad", color="#ef4444", icon="shield-halved"),
                Area(name="Operaciones", color="#3b82f6", icon="gears"),
                Area(name="Soporte", color="#f59e0b", icon="headset")
            ]
            db.session.add_all(areas)
            db.session.commit()
            areas = Area.query.all()

        # 3. Asegurar existencia de Plataformas
        platforms = Platform.query.all()
        if not platforms:
            print("🖥️ Creando plataformas...")
            platforms = []
            for area in areas:
                for i in range(2):
                    p = Platform(
                        name=f"Drive {area.name} {i+1}",
                        description=f"Almacenamiento centralizado para {area.name}",
                        area_id=area.id,
                        bg_color=area.color,
                        visits=random.randint(50, 500)
                    )
                    platforms.append(p)
            db.session.add_all(platforms)
            db.session.commit()
            platforms = Platform.query.all()

        # 4. Asegurar existencia de Usuarios y Relaciones
        users = User.query.all()
        if len(users) < 5:
            print("👥 Creando usuarios y asignando permisos...")
            for i in range(10):
                email = f"user{i}@nexus.ai"
                if not User.query.filter_by(email=email).first():
                    u = User(email=email, nombre=f"Nexus Operativo {i}", role="usuario")
                    u.set_password("admin123")
                    # Asignar a áreas aleatorias
                    u.areas.append(random.choice(areas))
                    # Asignar a plataformas aleatorias
                    u.platforms.append(random.choice(platforms))
                    db.session.add(u)
            db.session.commit()
            users = User.query.all()

        # 5. Generar Actividad de Tráfico (Últimos 7 días)
        print("📊 Generando telemetría de tráfico (7 días)...")
        actions = ['Alta', 'Descarga', 'Carpeta']
        base_date = datetime.now()
        
        for day in range(7):
            current_day = base_date - timedelta(days=day)
            # Generar entre 10 y 30 actividades por día
            num_activities = random.randint(15, 40)
            
            for _ in range(num_activities):
                action = random.choice(actions)
                # Tamaños aleatorios entre 5MB y 500MB en bytes
                size = random.randint(5 * 1024 * 1024, 500 * 1024 * 1024) if action != 'Carpeta' else 0
                
                activity = DriveActivity(
                    file_name=f"nexus_data_{random.randint(1000, 9999)}.dat",
                    file_path=f"/drive/storage/demo/file_{random.randint(1,100)}",
                    action=action,
                    file_size=size,
                    area_id=random.choice(areas).id,
                    platform_id=random.choice(platforms).id,
                    user_id=random.choice(users).id,
                    created_at=current_day - timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
                )
                db.session.add(activity)
        
        db.session.commit()
        print("✅ Generación completada con éxito.")

if __name__ == "__main__":
    generate_demo()
