import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.modules.core.models import Area, Platform

def list_data():
    app = create_app()
    with app.app_context():
        print(f"Areas: {Area.query.count()}")
        for a in Area.query.all():
            print(f"- Area: {a.name} (ID: {a.id})")
        
        print(f"Platforms: {Platform.query.count()}")
        for p in Platform.query.all():
            print(f"- Platform: {p.name} (ID: {p.id})")

if __name__ == "__main__":
    list_data()
