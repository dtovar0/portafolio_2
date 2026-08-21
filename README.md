# 🧠 NEXUS - UNIFIED SYSTEM TERMINAL

NEXUS es una plataforma de gestión centralizada diseñada para el monitoreo y administración de identidades, áreas operativas y plataformas de servicios.

## 🚀 Características Principales

*   **Gestión de Áreas y Plataformas**: Control centralizado de departamentos y los sistemas vinculados a ellos.
*   **Portal de Catálogo**: Vista unificada para que los usuarios finales exploren y marquen sus sistemas favoritos.
*   **Sistema de Solicitudes**: Flujo de aprobación para el acceso a plataformas restringidas.
*   **Seguridad de Grado Empresarial**: Sistema de autenticación con soporte LDAP y control de acceso basado en roles (RBAC).
*   **Sistema de Notificaciones**: Motor de plantillas configurable para alertas por correo electrónico y notificaciones in-app.
*   **Auditoría Integral**: Registro detallado de cada acción realizada en el sistema.

## 🛠️ Stack Tecnológico

*   **Backend**: Python 3.x, Flask como API JSON (`/api/v1`), modular con Blueprints.
*   **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS.
*   **Base de Datos**: SQLAlchemy (Soporte para SQLite y MySQL).
*   **Autenticación**: Flask-Login, con soporte para LDAP y SSO vía Authelia.
*   **Entorno**: Soporte nativo para variables `.env`.

Son **dos servicios** tras un reverse proxy: Flask no sirve interfaz, solo
datos; Next.js no accede a la base de datos, solo consume la API. Ver
[deploy/README.md](deploy/README.md).

## 📂 Estructura del Proyecto

```text
/
├── app/                  # Backend Flask (solo API)
│   ├── authz.py          # Autorización y alcance multitenant
│   ├── modules/
│   │   ├── api/          # API v1: lectura, escritura, admin y auth
│   │   ├── auth/         # Sesión, LDAP y SSO
│   │   ├── areas/        # Áreas (tenants)
│   │   ├── notifications/# SMTP y plantillas
│   │   ├── audit/        # Auditoría
│   │   └── settings/     # Configuración del sistema
│   └── utils/            # Utilidades compartidas
├── frontend/             # Frontend Next.js
│   └── src/
│       ├── app/          # Rutas (App Router)
│       ├── components/   # Componentes
│       └── lib/          # Cliente de API y tipos
├── assets/img/           # Imágenes subidas desde los ajustes
├── templates/errors/     # Páginas de error de Flask
├── deploy/               # systemd y Nginx
└── run.py                # Punto de entrada del backend
```

## ⚙️ Desarrollo

1.  **Configurar entorno**:
    ```bash
    cp .env.example .env    # editar con las credenciales
    ```
2.  **Backend** (Python 3.12):
    ```bash
    python3.12 -m venv venv
    venv/bin/pip install -r requirements.txt
    venv/bin/python run.py            # API en :5001
    ```
3.  **Frontend** (Node 18.18+, se recomienda 22 LTS):
    ```bash
    cd frontend
    npm ci
    npm run dev                       # interfaz en :3000
    ```

El `next.config.ts` reenvía `/api` y `/auth` al backend en desarrollo, así que
el navegador ve un solo origen y la cookie de sesión viaja sin CORS.

## 🚀 Instalación en servidor (Rocky Linux 8)

```bash
./deploy/preflight.sh          # evalúa el sistema, no modifica nada
sudo ./deploy/install.sh --domain nexus.example.com
```

`preflight.sh` comprueba distribución, recursos, Python, Node, cabeceras de
compilación, conectividad con la base de datos y Redis, puertos libres, nginx,
SELinux y firewalld. Sale con código 1 si hay algo que resolver antes.

`install.sh` instala los paquetes, crea el usuario de servicio, copia el
proyecto, monta el venv, construye el frontend, registra las dos unidades
systemd y configura nginx. Es idempotente. Opciones: `--prefix`, `--user`,
`--domain`, `--skip-packages`.

Detalles y notas de seguridad en [deploy/README.md](deploy/README.md).

## 📚 Documentación Adicional

*   [Reglas de Negocio](docs/business_rules.md): Lineamientos operativos y de diseño.
*   [Arquitectura Técnica](docs/ARCHITECTURE.md): Detalles sobre el flujo de datos y base de datos.
*   [Despliegue](deploy/README.md): Servicios systemd y reverse proxy.

## 🚧 Desarrollos Pendientes (Roadmap)

*   [ ] **Activación del Centro de Ayuda**: Habilitación visual de la documentación integrada para usuarios y administradores.

