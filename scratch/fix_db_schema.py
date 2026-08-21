import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import os
from app import create_app, db
from sqlalchemy import text

def add_missing_column():
    app = create_app()
    with app.app_context():
        try:
            print("🔍 Verificando tabla system_config...")
            # Intentar agregar la columna. Si ya existe, fallará el comando SQL pero lo manejamos.
            db.session.execute(text("ALTER TABLE system_config ADD COLUMN portal_banner TEXT AFTER bg_color"))
            db.session.commit()
            print("✅ Columna 'portal_banner' añadida exitosamente.")
        except Exception as e:
            db.session.rollback()
            if "Duplicate column name" in str(e):
                print("⚠️  La columna 'portal_banner' ya existe.")
            else:
                print(f"❌ Error al añadir la columna: {e}")

if __name__ == "__main__":
    add_missing_column()
