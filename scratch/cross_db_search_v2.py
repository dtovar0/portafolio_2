import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

def check_db(db_name):
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://username:password@localhost:3306/{db_name}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db = SQLAlchemy(app)
    
    with app.app_context():
        try:
            print(f"🔍 Buscando en base de datos: {db_name}")
            result = db.session.execute(text("SHOW TABLES"))
            tables = [r[0] for r in result]
            
            if 'areas' in tables:
                result = db.session.execute(text("SELECT name FROM areas WHERE name LIKE '%packet%'"))
                for row in result:
                    print(f"  [AREA] {row[0]}")
            
            if 'platforms' in tables:
                result = db.session.execute(text("SELECT name FROM platforms WHERE name LIKE '%FORTI%'"))
                for row in result:
                    print(f"  [PLATFORM] {row[0]}")
        except Exception as e:
            print(f"  ❌ Error: {e}")

if __name__ == "__main__":
    for db_name in ['admin_test', 'nexus_drive', 'nexus', 'bayblade', 'c20']:
        check_db(db_name)
