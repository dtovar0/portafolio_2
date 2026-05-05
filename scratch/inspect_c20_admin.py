import os
from sqlalchemy import create_engine, text

db_uri = "mysql+pymysql://username:password@localhost:3306/c20_admin"
engine = create_engine(db_uri)

def inspect_c20_admin():
    try:
        with engine.connect() as conn:
            print("📋 Estructura de system_config en c20_admin:")
            result = conn.execute(text("DESCRIBE system_config"))
            for row in result:
                print(row)
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    inspect_c20_admin()
