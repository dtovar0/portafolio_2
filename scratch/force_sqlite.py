import sys
import os
import random
from datetime import datetime, timedelta

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.modules.core.models import Area, Platform, DriveActivity
from app.modules.auth.models import User

def generate_demo_sqlite():
    app = create_app()
    # FORCE SQLITE for this run to ensure nexus.db is populated
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///nexus.db'
    
    with app.app_context():
        print(f"🚀 Generando datos en SQLITE: {app.config['SQLALCHEMY_DATABASE_URI']}")
        db.create_all()
        
        # 1. Áreas
        if not Area.query.first():
            areas = [
                Area(name="Infraestructura", color="#8b5cf6", icon="server"),
                Area(name="Desarrollo", color="#10b981", icon="code"),
                Area(name="Ciberseguridad", color="#ef4444", icon="shield-halved"),
                Area(name="Operaciones", color="#3b82f6", icon="gears")
            ]
            db.session.add_all(areas)
            db.session.commit()
        
        areas = Area.query.all()
        
        # 2. Plataformas
        if not Platform.query.first():
            platforms = []
            for area in areas:
                p = Platform(name=f"Drive {area.name}", area_id=area.id, bg_color=area.color, visits=random.randint(100, 1000))
                platforms.append(p)
            db.session.add_all(platforms)
            db.session.commit()
        
        platforms = Platform.query.all()
        
        # 3. Usuarios
        if not User.query.filter_by(email='admin').first():
            admin = User(email='admin', nombre='Administrador', role='administrador')
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            
        users = User.query.all()
        
        # 4. Actividad
        print("📊 Inyectando actividad temporal...")
        actions = ['Alta', 'Descarga']
        for d in range(7):
            date = datetime.now() - timedelta(days=d)
            for _ in range(20):
                act = DriveActivity(
                    file_name=f"test_{random.randint(1,999)}.zip",
                    action=random.choice(actions),
                    file_size=random.randint(10*1024*1024, 1000*1024*1024),
                    area_id=random.choice(areas).id,
                    platform_id=random.choice(platforms).id,
                    user_id=random.choice(users).id,
                    created_at=date - timedelta(hours=random.randint(0,23))
                )
                db.session.add(act)
        
        db.session.commit()
        print("✅ SQLite poblado con éxito.")

if __name__ == "__main__":
    generate_demo_sqlite()
