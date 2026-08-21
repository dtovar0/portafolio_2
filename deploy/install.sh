#!/usr/bin/env bash
#
# Instalación de Nexus en Rocky Linux 8.
#
#   sudo ./deploy/install.sh [--prefix /opt/nexus] [--user nexus] [--domain nexus.example.com]
#
# Ejecutar antes ./deploy/preflight.sh: este script asume que la evaluación pasó.
# Es idempotente: se puede repetir para actualizar una instalación existente.
#
# Qué hace, en orden:
#   1. Paquetes del sistema (Python 3.12, Node 22, nginx, cabeceras de compilación)
#   2. Usuario de servicio sin shell
#   3. Copia del proyecto al prefijo y permisos
#   4. venv del backend y build del frontend
#   5. Unidades systemd
#   6. nginx como reverse proxy, con SELinux y firewalld
#
# No toca la base de datos: las migraciones de utils/migrations se aplican a mano.

set -Eeuo pipefail

PREFIX="/opt/nexus"
SVC_USER="nexus"
DOMAIN=""
PY_BIN="python3.12"
NODE_MAJOR="22"
SKIP_PKGS=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --prefix) PREFIX="$2"; shift 2 ;;
        --user)   SVC_USER="$2"; shift 2 ;;
        --domain) DOMAIN="$2"; shift 2 ;;
        --skip-packages) SKIP_PKGS=1; shift ;;
        -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
        *) echo "Opción desconocida: $1" >&2; exit 2 ;;
    esac
done

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { printf "\n==> %s\n" "$1"; }
note() { printf "    %s\n" "$1"; }
die()  { printf "\nERROR: %s\n" "$1" >&2; exit 1; }

trap 'die "falló en la línea $LINENO. Nada más se ha modificado."' ERR

[[ $EUID -eq 0 ]] || die "hay que ejecutarlo como root (sudo)."
[[ -f "$SRC/run.py" && -f "$SRC/frontend/package.json" ]] \
    || die "no encuentro el proyecto en $SRC"

# --- 1. Paquetes -------------------------------------------------------------
if (( SKIP_PKGS )); then
    log "Paquetes del sistema (omitido por --skip-packages)"
else
    log "Paquetes del sistema"

    # Python 3.12 y Node 22 vienen como módulos de AppStream en RHEL 8.
    if ! command -v "$PY_BIN" >/dev/null 2>&1; then
        note "instalando python312"
        dnf -y module reset python312 >/dev/null 2>&1 || true
        dnf -y module enable python312 >/dev/null 2>&1 || true
        dnf -y install python312 python312-devel
    else
        note "$($PY_BIN --version) ya presente"
    fi

    node_major_now=0
    command -v node >/dev/null 2>&1 && \
        node_major_now=$(node --version | sed 's/^v//;s/\..*//')
    if (( node_major_now < 18 )); then
        note "instalando Node ${NODE_MAJOR}"
        if dnf -y module list "nodejs:${NODE_MAJOR}" >/dev/null 2>&1; then
            dnf -y module reset nodejs >/dev/null 2>&1 || true
            dnf -y module enable "nodejs:${NODE_MAJOR}"
            dnf -y install nodejs npm
        else
            # AppStream de Rocky 8 puede no llegar a Node 22; NodeSource sí.
            note "el módulo nodejs:${NODE_MAJOR} no está; usando NodeSource"
            curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
            dnf -y install nodejs
        fi
    else
        note "Node $(node --version) ya presente"
    fi

    # cryptography, ldap3 y PyMySQL compilan si no hay rueda para la plataforma.
    note "cabeceras de compilación y utilidades"
    dnf -y install gcc make openssl-devel libffi-devel openldap-devel \
                   mariadb-devel mysql nginx policycoreutils-python-utils \
        || die "no se pudieron instalar los paquetes; revisar los repositorios"
fi

# --- 2. Usuario de servicio --------------------------------------------------
log "Usuario de servicio"
if id "$SVC_USER" >/dev/null 2>&1; then
    note "$SVC_USER ya existe"
else
    # Sin shell y sin home propio: solo ejecuta los servicios.
    useradd --system --no-create-home --shell /sbin/nologin "$SVC_USER"
    note "creado $SVC_USER (sin shell)"
fi

# --- 3. Copia del proyecto ---------------------------------------------------
log "Copiando el proyecto a $PREFIX"
mkdir -p "$PREFIX" /var/log/nexus

if [[ "$(realpath "$SRC")" == "$(realpath "$PREFIX")" ]]; then
    note "el origen ya es $PREFIX; no se copia"
else
    # venv y node_modules no son portables: se recrean en el destino.
    rsync -a --delete \
        --exclude 'venv/' \
        --exclude 'frontend/node_modules/' \
        --exclude 'frontend/.next/' \
        --exclude '__pycache__/' \
        --exclude '*.pyc' \
        --exclude '.git/' \
        --exclude 'scratch/' \
        "$SRC/" "$PREFIX/"
    note "copiado (sin venv, node_modules, .next ni scratch)"
fi

if [[ ! -f "$PREFIX/.env" ]]; then
    die ".env no existe en $PREFIX. Copiarlo y rellenar las credenciales antes de seguir."
fi
# Contiene credenciales de base de datos: solo el usuario del servicio.
chown "$SVC_USER:$SVC_USER" "$PREFIX/.env"
chmod 600 "$PREFIX/.env"
chown -R "$SVC_USER:$SVC_USER" "$PREFIX" /var/log/nexus

# --- 4. Backend --------------------------------------------------------------
log "Backend (venv y dependencias)"
sudo -u "$SVC_USER" "$PY_BIN" -m venv "$PREFIX/venv"
sudo -u "$SVC_USER" "$PREFIX/venv/bin/pip" install --quiet --upgrade pip wheel
sudo -u "$SVC_USER" "$PREFIX/venv/bin/pip" install --quiet -r "$PREFIX/requirements.txt" \
    || die "fallo instalando dependencias de Python"
note "venv listo en $PREFIX/venv"

# --- 5. Frontend -------------------------------------------------------------
log "Frontend (dependencias y build)"
pushd "$PREFIX/frontend" >/dev/null
sudo -u "$SVC_USER" npm ci --no-audit --no-fund \
    || die "fallo en npm ci"
sudo -u "$SVC_USER" npm run build \
    || die "fallo en 'next build' (si es por memoria, añadir swap)"

# El build standalone no copia los estáticos ni public/: hay que ponerlos donde
# server.js los espera, o la página carga sin CSS ni imágenes.
sudo -u "$SVC_USER" cp -r .next/static .next/standalone/.next/static
[[ -d public ]] && sudo -u "$SVC_USER" cp -r public .next/standalone/public
popd >/dev/null
note "build en $PREFIX/frontend/.next/standalone"

# --- 6. Servicios ------------------------------------------------------------
log "Servicios systemd"
for unit in nexus-backend nexus-frontend; do
    # El orden importa: primero las rutas, luego usuario y grupo.
    sed -e "s|/opt/nexus|${PREFIX}|g" \
        -e "s|^User=.*|User=${SVC_USER}|" \
        -e "s|^Group=.*|Group=${SVC_USER}|" \
        "$PREFIX/deploy/${unit}.service" > "/etc/systemd/system/${unit}.service"
    note "instalada ${unit}.service"
done
systemctl daemon-reload
systemctl enable --now nexus-backend nexus-frontend
sleep 3
for unit in nexus-backend nexus-frontend; do
    systemctl is-active --quiet "$unit" \
        && note "$unit activo" \
        || { journalctl -u "$unit" -n 20 --no-pager; die "$unit no arrancó"; }
done

# --- 7. Reverse proxy --------------------------------------------------------
log "nginx"
conf="/etc/nginx/conf.d/nexus.conf"
if [[ -n "$DOMAIN" ]]; then
    sed "s|nexus.example.com|${DOMAIN}|g" "$PREFIX/deploy/nginx-nexus.conf" > "$conf"
    note "configuración escrita para $DOMAIN"
else
    cp "$PREFIX/deploy/nginx-nexus.conf" "$conf"
    note "configuración escrita; falta ajustar server_name y los certificados"
fi

if command -v getenforce >/dev/null 2>&1 && [[ "$(getenforce)" == "Enforcing" ]]; then
    # Sin este booleano nginx no puede conectar con los upstream y responde 502.
    setsebool -P httpd_can_network_connect 1
    note "SELinux: httpd_can_network_connect activado"
fi

if nginx -t 2>/dev/null; then
    systemctl enable --now nginx
    systemctl reload nginx
    note "nginx recargado"
else
    nginx -t || true
    note "AVISO: 'nginx -t' falla — revisar $conf (certificados, server_name)"
fi

if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
    firewall-cmd --permanent --add-service=http  >/dev/null 2>&1 || true
    firewall-cmd --reload >/dev/null 2>&1 || true
    note "firewalld: http y https permitidos"
fi

# --- Resumen -----------------------------------------------------------------
cat <<FIN

Instalación terminada.

  backend    ${PREFIX} (127.0.0.1:5001)
  frontend   ${PREFIX}/frontend (127.0.0.1:3000)
  registros  /var/log/nexus, journalctl -u nexus-backend -f

Pendiente:
  1. Migraciones, si es una actualización:
       cd ${PREFIX} && mysql -u USUARIO -p BASE < utils/migrations/00X_*.sql
  2. Certificados y server_name en /etc/nginx/conf.d/nexus.conf
  3. Comprobar:  curl -s localhost:5001/api/v1/auth/context
                 curl -s -o /dev/null -w '%{http_code}\\n' localhost:3000/login

Los puertos 5001 y 3000 escuchan solo en loopback a propósito: el backend
deduce la identidad del SSO de cabeceras que solo nginx debe poder inyectar.
FIN
