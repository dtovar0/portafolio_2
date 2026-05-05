import os
from sqlalchemy import create_engine, text

# Conexión genérica (sin DB específica)
db_uri = "mysql+pymysql://username:password@localhost:3306/"
engine = create_engine(db_uri)

def list_dbs():
    try:
        with engine.connect() as conn:
            print("📋 Listado de Bases de Datos:")
            result = conn.execute(text("SHOW DATABASES"))
            for row in result:
                print(row[0])
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    list_dbs()
