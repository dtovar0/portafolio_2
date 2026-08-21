"""Crea admins de área para probar el aislamiento multitenant.

No modifica datos existentes: solo añade usuarios de prueba con prefijo
'ta_' (tenant admin) y les asigna áreas a administrar.
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from app import create_app, db
from app.modules.auth.models import User
from app.modules.core.models import Area, Platform

app = create_app()
with app.app_context():
    areas = Area.query.order_by(Area.id).all()
    if len(areas) < 2:
        print("Se requieren al menos 2 áreas"); sys.exit(1)

    # Dos admins de área con áreas disjuntas
    plan = [('ta_uno@nexus.ai', 'Tenant Admin Uno', areas[:2]),
            ('ta_dos@nexus.ai', 'Tenant Admin Dos', areas[2:4] or areas[1:2])]

    for email, nombre, my_areas in plan:
        u = User.query.filter_by(email=email).first()
        if not u:
            u = User(email=email, nombre=nombre, role='admin_area', auth_source='local')
            u.set_password('test123')
            db.session.add(u)
        u.role = 'admin_area'
        u.managed_areas = my_areas
        u.areas = my_areas
        print(f"  {email:20} administra: {[a.name for a in my_areas]}")

    # Un usuario normal en el area del primer tenant
    ue = 'tu_uno@nexus.ai'
    nu = User.query.filter_by(email=ue).first()
    if not nu:
        nu = User(email=ue, nombre='Usuario Tenant Uno', role='usuario', auth_source='local')
        nu.set_password('test123')
        db.session.add(nu)
    nu.role = 'usuario'
    nu.areas = areas[:1]
    print(f"  {ue:20} pertenece a:  {[a.name for a in areas[:1]]}")

    db.session.commit()
    print("\nSeed listo.")
