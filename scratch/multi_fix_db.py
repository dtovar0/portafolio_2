import os
from sqlalchemy import create_engine, text

databases = ["admin_test", "c20_admin", "nexus", "c20"]

def multi_fix():
    for db_name in databases:
        db_uri = f"mysql+pymysql://username:password@localhost:3306/{db_name}"
        engine = create_engine(db_uri)
        try:
            with engine.connect() as conn:
                print(f"🔍 Verificando tabla system_config en {db_name}...")
                # Verificar si la tabla existe primero
                table_exists = conn.execute(text(f"SHOW TABLES LIKE 'system_config'")).fetchone()
                if table_exists:
                    conn.execute(text("ALTER TABLE system_config ADD COLUMN portal_banner TEXT AFTER bg_color"))
                    conn.commit()
                    print(f"✅ Columna 'portal_banner' añadida exitosamente en {db_name}.")
                else:
                    print(f"ℹ️  La tabla system_config no existe en {db_name}.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print(f"⚠️  La columna 'portal_banner' ya existe en {db_name}.")
            else:
                print(f"❌ Error en {db_name}: {e}")

if __name__ == "__main__":
    multi_fix()
