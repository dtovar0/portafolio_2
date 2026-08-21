# Despliegue

Dos servicios tras Nginx:

| Servicio | Puerto | Qué sirve |
|---|---|---|
| `nexus-backend` (Flask/Gunicorn) | 127.0.0.1:5001 | API `/api/v1`, login `/auth` |
| `nexus-frontend` (Next.js) | 127.0.0.1:3000 | La interfaz |

Nginx enruta `/api/` y `/auth/` al backend y el resto al frontend. Ambos van
bajo el mismo dominio a propósito: así la cookie de sesión que emite Flask
viaja al frontend sin necesidad de CORS, y Authelia sigue siendo la autoridad
de autenticación.

## Instalación

```bash
# Backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt

# Frontend
cd frontend && npm ci && npm run build
```

El build usa `output: standalone`, así que el servicio arranca
`.next/standalone/server.js`. **`next start` no funciona con esa
configuración** — Next lo advierte al arrancar.

Tras `npm run build`, `standalone` no copia los assets estáticos; hay que
enlazarlos o copiarlos:

```bash
cp -r frontend/public frontend/.next/standalone/ 2>/dev/null || true
cp -r frontend/.next/static frontend/.next/standalone/.next/
```

## Servicios

```bash
sudo cp deploy/nexus-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nexus-backend nexus-frontend
```

Ajustar en las unidades `User`, `WorkingDirectory` y la ruta de `node` según el
servidor. Las unidades asumen `/opt/nexus`.

## Nginx

```bash
sudo cp deploy/nginx-nexus.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx
```

Rellenar `server_name` y las rutas de los certificados.

## Notas

- El `venv/` del repositorio es de desarrollo (Python 3.12) y no es portable:
  recrearlo en el servidor.
- `EnvironmentFile=/opt/nexus/.env` debe existir y contener las credenciales de
  MySQL. No está en el repositorio.
- Mientras convivan los dos frontends, `/static/` sigue apuntando a Flask para
  las vistas Jinja que quedan.
