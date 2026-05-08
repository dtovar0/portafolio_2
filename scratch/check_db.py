import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.modules.core.models import Area, Platform, DriveActivity
from app.modules.auth.models import User

def check_db():
    app = create_app()
    with app.app_context():
        print(f"Checking Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print(f"Areas: {Area.query.count()}")
        print(f"Platforms: {Platform.query.count()}")
        print(f"Users: {User.query.count()}")
        print(f"DriveActivity: {DriveActivity.query.count()}")
        
        latest = DriveActivity.query.order_by(DriveActivity.created_at.desc()).limit(5).all()
        for l in latest:
            print(f"- {l.created_at}: {l.action} ({l.file_size} bytes)")

if __name__ == "__main__":
    check_db()
