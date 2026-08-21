import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import os
from app import create_app, db
from sqlalchemy import text

def inspect_table():
    app = create_app()
    with app.app_context():
        try:
            print("📋 Estructura de la tabla system_config:")
            result = db.session.execute(text("DESCRIBE system_config"))
            for row in result:
                print(row)
        except Exception as e:
            print(f"❌ Error al inspeccionar la tabla: {e}")

if __name__ == "__main__":
    inspect_table()
