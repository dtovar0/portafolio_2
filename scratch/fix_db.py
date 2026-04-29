from app import create_app, db
import sqlalchemy as sa

app = create_app()
with app.app_context():
    inspector = sa.inspect(db.engine)
    if 'user_favorites' not in inspector.get_table_names():
        print("🛠️ Tabla 'user_favorites' no encontrada. Creándola...")
        # Create specifically this table
        from app.modules.auth.models import user_favorites
        user_favorites.create(db.engine)
        print("✅ Tabla 'user_favorites' creada correctamente.")
    else:
        print("✅ La tabla 'user_favorites' ya existe.")
