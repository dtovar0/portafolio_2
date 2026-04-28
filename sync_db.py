import os
from app import create_app, db
from sqlalchemy import text

app = create_app()

def sync_schema():
    with app.app_context():
        print("🔍 Comprobando integridad del esquema de base de datos...")
        
        # 1. Tabla Platforms
        try:
            db.session.execute(text("ALTER TABLE platforms ADD COLUMN visits INT DEFAULT 0"))
            db.session.commit()
            print("✅ Columna 'visits' añadida a 'platforms'")
        except Exception:
            db.session.rollback()
            print("ℹ️ Columna 'visits' ya existe o no pudo ser creada en 'platforms'")

        # 2. Tabla Audit Logs (Nuevos campos premium)
        cols_audit = [
            ("module", "VARCHAR(50)"),
            ("target", "VARCHAR(100)"),
            ("description", "TEXT")
        ]
        
        for col, col_type in cols_audit:
            try:
                db.session.execute(text(f"ALTER TABLE audit_logs ADD COLUMN {col} {col_type}"))
                db.session.commit()
                print(f"✅ Columna '{col}' añadida a 'audit_logs'")
            except Exception:
                db.session.rollback()
                print(f"ℹ️ Columna '{col}' ya existe en 'audit_logs'")

        # 3. Marcar tabla de Solicitudes (Asegurar user_email)
        try:
            db.session.execute(text("ALTER TABLE access_requests ADD COLUMN user_email VARCHAR(120)"))
            db.session.commit()
            print("✅ Columna 'user_email' añadida a 'access_requests'")
        except Exception:
            db.session.rollback()
            print("ℹ️ Columna 'user_email' ya existe en 'access_requests'")

        print("\n🚀 Sincronización finalizada.")

if __name__ == "__main__":
    sync_schema()
