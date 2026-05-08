import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db

def trace_db():
    app = create_app()
    with app.app_context():
        print(f"SQLALCHEMY_DATABASE_URI: {app.config.get('SQLALCHEMY_DATABASE_URI')}")
        print(f"Instance Path: {app.instance_path}")
        # Check if we can get the actual engine URL
        print(f"Engine URL: {db.engine.url}")

if __name__ == "__main__":
    trace_db()
