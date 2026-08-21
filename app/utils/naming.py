"""Saneamiento de nombres visibles (áreas, plataformas).

Antes lo hacía `StorageManager.sanitize_filename`, que estaba pensado para
nombres de archivo: pasaba por `secure_filename` y por tanto destruía acentos y
espacios. Los nombres de área ya no son rutas en disco, así que aquí solo se
recorta lo que puede causar problemas al mostrarlos o inyectarlos.
"""

import re

_CONTROL = re.compile(r'[\x00-\x1f\x7f]')
_UNSAFE = re.compile(r'[<>"\\/{}|`]')
_SPACES = re.compile(r'\s+')

MAX_LENGTH = 100


def sanitize_display_name(value, fallback='Sin nombre'):
    """Normaliza un nombre legible conservando acentos y espacios.

    Elimina caracteres de control y los que podrían romper una plantilla o una
    ruta, colapsa espacios y recorta a la longitud de la columna.
    """
    if not value:
        return fallback

    name = _CONTROL.sub('', str(value))
    name = name.replace('..', '')
    name = _UNSAFE.sub('-', name)
    name = _SPACES.sub(' ', name).strip(' .-')

    if not name:
        return fallback
    return name[:MAX_LENGTH]
