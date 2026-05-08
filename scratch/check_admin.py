import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.modules.auth.models import User

def check_admin():
    app = create_app()
    with app.app_context():
        admin = User.query.filter_by(email='admin').first()
        if admin:
            print(f"Admin User Found: ID={admin.id}")
            print(f"Last Login: {admin.last_login_at}")
            print(f"Created At: {admin.created_at}")
        else:
            print("Admin User NOT Found")

if __name__ == "__main__":
    check_admin()
