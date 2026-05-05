import os
from sqlalchemy import create_engine, text

# Conexión manual para forzar otra DB
db_uri = "mysql+pymysql://username:password@localhost:3306/bayblade_tournament"
engine = create_engine(db_uri)

def fix_external_db():
    try:
        with engine.connect() as conn:
            print("🔍 Verificando tabla system_config en bayblade_tournament...")
            conn.execute(text("ALTER TABLE system_config ADD COLUMN portal_banner TEXT AFTER bg_color"))
            conn.commit()
            print("✅ Columna 'portal_banner' añadida exitosamente en bayblade_tournament.")
    except Exception as e:
        if "Duplicate column name" in str(e):
            print("⚠️  La columna 'portal_banner' ya existe.")
        elif "doesn't exist" in str(e):
            print("ℹ️  La tabla system_config no existe en esta base de datos.")
        else:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    fix_external_db()
