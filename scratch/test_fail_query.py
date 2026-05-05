import os
from app import create_app, db
from sqlalchemy import text

def test_query():
    app = create_app()
    with app.app_context():
        try:
            sql = """
            SELECT system_config.id AS system_config_id, system_config.portal_name AS system_config_portal_name, 
            system_config.portal_identity_type AS system_config_portal_identity_type, system_config.portal_icon AS system_config_portal_icon, 
            system_config.bg_color AS system_config_bg_color, system_config.portal_banner AS system_config_portal_banner, 
            system_config.text_color AS system_config_text_color, system_config.updated_at AS system_config_updated_at 
            FROM system_config LIMIT 1
            """
            print("🚀 Ejecutando query de prueba...")
            result = db.session.execute(text(sql))
            row = result.fetchone()
            print(f"✅ Resultado: {row}")
        except Exception as e:
            print(f"❌ Error en la query: {e}")

if __name__ == "__main__":
    test_query()
