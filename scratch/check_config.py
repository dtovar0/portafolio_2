import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.modules.settings.models import SystemConfig

def check_config():
    app = create_app()
    with app.app_context():
        config = SystemConfig.query.first()
        if config:
            print(f"Portal Name: {config.portal_name}")
            print(f"Portal Logo BG: {config.portal_logo_bg}")
        else:
            print("SystemConfig NOT Found")

if __name__ == "__main__":
    check_config()
