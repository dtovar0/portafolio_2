import os
import sys
from sqlalchemy import text

# Añadir el directorio raíz al path para importar la app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db

app = create_app()

with app.app_context():
    try:
        # Intentar agregar la columna portal_banner a la tabla system_config
        sql = text("ALTER TABLE system_config ADD COLUMN portal_banner TEXT NULL AFTER bg_color")
        db.session.execute(sql)
        db.session.commit()
        print("✅ Columna 'portal_banner' añadida exitosamente a la tabla 'system_config'.")
    except Exception as e:
        error_msg = str(e)
        if "Duplicate column name" in error_msg or "already exists" in error_msg:
            print("ℹ️ La columna 'portal_banner' ya existe en la base de datos.")
        else:
            print(f"❌ Error al intentar modificar la tabla: {error_msg}")
            db.session.rollback()

    print("\nProceso de actualización de esquema finalizado.")
