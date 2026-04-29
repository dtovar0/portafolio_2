import os
import sys
import random
from datetime import datetime, timedelta

# Añadir el directorio raíz al path para importar la app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.modules.core.models import Area, Platform, AccessRequest
from app.modules.auth.models import User

app = create_app()

with app.app_context():
    # 1. Asegurar que tenemos usuarios y plataformas
    users = User.query.all()
    platforms = Platform.query.all()

    if not users:
        print("⚠️ No hay usuarios, creando algunos de prueba...")
        for i in range(5):
            u = User(email=f"user{i}@nexus.com", nombre=f"Usuario de Prueba {i}")
            u.set_password("admin123")
            db.session.add(u)
        db.session.commit()
        users = User.query.all()

    if not platforms:
        print("⚠️ No hay plataformas, abortando seed.")
        sys.exit(1)

    # 2. Generar 20 solicitudes
    statuses = ['Pendiente', 'Aprobado', 'Denegado']
    
    print(f"🚀 Generando 20 solicitudes de acceso...")
    
    for i in range(20):
        user = random.choice(users)
        platform = random.choice(platforms)
        status = random.choice(statuses)
        
        # Fecha aleatoria en los últimos 7 días
        days_ago = random.randint(0, 7)
        hours_ago = random.randint(0, 23)
        created_date = datetime.now() - timedelta(days=days_ago, hours=hours_ago)
        
        req = AccessRequest(
            platform_id=platform.id,
            user_email=user.email,
            status=status,
            created_at=created_date
        )
        
        if status != 'Pendiente':
            req.processed_at = created_date + timedelta(hours=random.randint(1, 24))
            
        db.session.add(req)

    db.session.commit()
    print("✅ 20 solicitudes de prueba generadas correctamente.")
