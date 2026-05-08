import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.modules.auth.models import User

def list_users():
    app = create_app()
    with app.app_context():
        print(f"Connecting to: {app.config['SQLALCHEMY_DATABASE_URI']}")
        users = User.query.all()
        print(f"Total Users in DB: {len(users)}")
        for u in users:
            print(f"- ID: {u.id} | Email: {u.email} | Role: {u.role}")

if __name__ == "__main__":
    list_users()
