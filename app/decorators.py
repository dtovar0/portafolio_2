"""
Compatibilidad: los decoradores viven ahora en `app.authz`.

Se mantiene este módulo para no romper los imports existentes. El código nuevo
debe importar desde `app.authz`.
"""

from app.authz import admin_required, area_admin_required, platform_access_required

__all__ = ['admin_required', 'area_admin_required', 'platform_access_required']
