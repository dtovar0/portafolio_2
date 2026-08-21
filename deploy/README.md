# Despliegue

Dos servicios tras un reverse proxy:

| Servicio | Escucha | Sirve |
|---|---|---|
| `nexus-backend` (Flask/Gunicorn) | 127.0.0.1:5001 | API `/api/v1` |
| `nexus-frontend` (Next.js) | 127.0.0.1:3000 | La interfaz |

Nginx enruta `/api/` y `/auth/` al backend y el resto al frontend. Ambos van
bajo el mismo dominio a propósito: así la cookie de sesión que emite Flask
llega al frontend sin CORS, y Authelia sigue siendo la autoridad de
autenticación.

## Instalación automatizada (Rocky Linux 8)

```bash
./deploy/preflight.sh                              # evaluación, no modifica nada
sudo ./deploy/install.sh --domain nexus.ejemplo.com
```

`preflight.sh` termina con código 1 si encuentra algo bloqueante. Revisa:

- Distribución y arquitectura
- Espacio (2 GB) y memoria (1 GB; `next build` es lo que más consume)
- Python 3.12 con `venv`, y Node ≥ 18.18
- Cabeceras de compilación (`gcc`, `openssl-devel`, `libffi-devel`,
  `openldap-devel`), que `cryptography` y `ldap3` necesitan si no hay rueda
  binaria para la plataforma
- Conectividad real con la base de datos y con Redis, leyendo `.env`
- Que `SECRET_KEY` esté definida
- Puertos 5001 y 3000 libres
- nginx, SELinux (`httpd_can_network_connect`) y firewalld

`install.sh` acepta `--prefix` (por defecto `/opt/nexus`), `--user` (`nexus`),
`--domain` y `--skip-packages`. Es idempotente: repetirlo actualiza la
instalación.

### Notas propias de Rocky 8

- **Python 3.12** no es el del sistema (que es 3.6): viene como módulo de
  AppStream. El script hace `dnf module enable python312`.
- **Node 22** puede no estar en AppStream según la versión menor de Rocky; si
  falta el módulo, el script cae al repositorio de NodeSource.
- **SELinux** en `Enforcing` impide que nginx conecte con los upstream locales,
  y responde 502 sin explicación clara. El script activa
  `httpd_can_network_connect`.
- **firewalld** suele venir activo: el script permite `http` y `https`.

## Instalación manual

```bash
# Backend
python3.12 -m venv venv
venv/bin/pip install -r requirements.txt

# Frontend
cd frontend && npm ci && npm run build
```

El build usa `output: standalone`, así que el servicio arranca
`.next/standalone/server.js` — **`next start` no funciona con esa
configuración** y Next lo advierte al arrancar.

`standalone` **no copia los estáticos**, hay que ponerlos donde `server.js` los
busca, o la interfaz carga sin CSS:

```bash
cp -r frontend/.next/static frontend/.next/standalone/.next/static
[ -d frontend/public ] && cp -r frontend/public frontend/.next/standalone/
```

`server.js` resuelve esas rutas relativas a su propio directorio, por eso la
unidad systemd usa `WorkingDirectory=.../.next/standalone`.

### Servicios

```bash
sudo cp deploy/nexus-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nexus-backend nexus-frontend
```

### Nginx

```bash
sudo cp deploy/nginx-nexus.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx
```

Rellenar `server_name` y las rutas de los certificados.

## Migraciones

No las aplica el instalador. En una actualización, revisar
`utils/migrations/` y ejecutar las que falten en orden:

```bash
mysql -u USUARIO -p BASE < utils/migrations/002_drop_drive.sql
venv/bin/python utils/migrations/003_logo_to_db.py
mysql -u USUARIO -p BASE < utils/migrations/004_drop_access_requests.sql
```

## Seguridad

Los puertos de ambos servicios deben escuchar **solo en loopback**. El backend
deduce la identidad SSO de las cabeceras `Remote-*`, y solo las acepta si la
petición viene de un proxy declarado en `TRUSTED_PROXIES` (por defecto
loopback). Nginx, además, borra esas cabeceras si las envía el cliente: sin
eso, cualquiera que alcance el puerto podría enviar `Remote-Email: admin` y
entrar como administrador.

## Notas

- El `venv` del repositorio es de desarrollo y no es portable entre máquinas
  con versiones distintas de Python: hay que recrearlo en el servidor.
- El backend no sirve ningún archivo estático. El logo del portal se guarda
  como data URI en la base de datos, así que no hace falta volumen persistente
  más allá de la BD.
- `FRONTEND_URL` indica al backend dónde redirigir las rutas heredadas. Tras
  Nginx puede quedar vacío (mismo dominio); en desarrollo, apuntar al puerto de
  Next.js.
