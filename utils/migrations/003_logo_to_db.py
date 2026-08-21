"""Migra el logo del portal del sistema de archivos a la base de datos.

Antes se guardaba en assets/img/branding/ y portal_icon almacenaba su ruta.
Ahora se guarda como data URI, de modo que el backend no necesita servir
estáticos y el logo viaja con la configuración en los respaldos.

Idempotente: si portal_icon no apunta a un archivo, no hace nada.
"""
import base64
import os
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))

from app import create_app, db
from app.modules.settings.models import SystemConfig

MIMES = {'jpg': 'jpeg', 'jpeg': 'jpeg', 'png': 'png',
         'gif': 'gif', 'webp': 'webp', 'svg': 'svg+xml'}


def main():
    app = create_app()
    with app.app_context():
        config = SystemConfig.query.first()
        if config is None:
            print('Sin configuración de sistema; nada que migrar.')
            return

        icon = config.portal_icon or ''
        if not icon.startswith('/assets/'):
            print('portal_icon no apunta a un archivo; nada que migrar.')
            return

        path = os.path.join(os.getcwd(), icon.lstrip('/'))
        if not os.path.exists(path):
            print(f'{icon} no existe en disco; se deja sin cambios.')
            return

        ext = path.rsplit('.', 1)[-1].lower()
        mime = MIMES.get(ext, 'png')
        with open(path, 'rb') as handle:
            payload = base64.b64encode(handle.read()).decode()
        config.portal_icon = f'data:image/{mime};base64,{payload}'
        db.session.commit()
        print(f'Logo migrado a la base de datos ({len(config.portal_icon)} bytes).')
        print(f'Ya se puede eliminar {path}')


if __name__ == '__main__':
    main()
