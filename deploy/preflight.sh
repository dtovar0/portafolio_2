#!/usr/bin/env bash
#
# Evaluación previa a la instalación de Nexus en Rocky Linux 8.
#
# No instala ni modifica nada: solo informa de qué hay, qué falta y qué
# decisiones habrá que tomar. Ejecutarlo antes de install.sh.
#
#   sudo ./deploy/preflight.sh
#
# Salida: 0 si se puede instalar, 1 si hay algo que resolver antes.

set -uo pipefail

# --- Requisitos del proyecto -------------------------------------------------
# El proyecto funciona con Python 3.11 o superior; no exige 3.12. Se usa el
# intérprete ya instalado y solo se instala uno si no hay ninguno válido.
PY_MIN_MINOR=11
PY_BIN=""                      # se resuelve más abajo
NODE_MAJOR="22"                # Next.js 15 requiere Node >= 18.18; se usa 22 LTS
MIN_DISK_MB=2048               # node_modules + venv + build
MIN_RAM_MB=1024                # `next build` es lo que más consume
API_PORT="${API_PORT:-5001}"
WEB_PORT="${WEB_PORT:-3000}"

problems=0
warnings=0

# Color solo en terminal: al redirigir a un fichero o a un pipe, texto plano.
if [[ -t 1 ]]; then
    c_ok=$'\033[32m'; c_warn=$'\033[33m'; c_bad=$'\033[31m'
    c_bold=$'\033[1m'; c_off=$'\033[0m'
else
    c_ok=''; c_warn=''; c_bad=''; c_bold=''; c_off=''
fi
ok()   { printf "  %sOK%s    %s\n" "$c_ok" "$c_off" "$1"; }
warn() { printf "  %sAVISO%s %s\n" "$c_warn" "$c_off" "$1"; warnings=$((warnings+1)); }
bad()  { printf "  %sFALTA%s %s\n" "$c_bad" "$c_off" "$1"; problems=$((problems+1)); }
head2(){ printf "\n%s%s%s\n" "$c_bold" "$1" "$c_off"; }

# --- 1. Sistema operativo ----------------------------------------------------
head2 "Sistema"

if [[ -r /etc/os-release ]]; then
    . /etc/os-release
    printf "  %s\n" "${PRETTY_NAME:-desconocido}"
    major="${VERSION_ID%%.*}"
    case "${ID}:${major}" in
        rocky:8|rhel:8|centos:8|almalinux:8)
            ok "distribución compatible (familia RHEL 8)" ;;
        rocky:9|rhel:9|almalinux:9)
            warn "RHEL 9: el script sirve, pero Python 3.12 y Node vienen de repos distintos" ;;
        *)
            warn "distribución no probada; el script asume dnf y familia RHEL" ;;
    esac
else
    bad "no se pudo identificar la distribución (/etc/os-release ausente)"
fi

printf "  arquitectura: %s\n" "$(uname -m)"
[[ "$(uname -m)" == "x86_64" || "$(uname -m)" == "aarch64" ]] \
    || warn "arquitectura poco habitual; Node puede no tener binario oficial"

# --- 2. Privilegios ----------------------------------------------------------
head2 "Privilegios"
if [[ $EUID -eq 0 ]]; then
    ok "ejecutando como root"
elif sudo -n true 2>/dev/null; then
    ok "sudo disponible sin contraseña"
else
    warn "hará falta contraseña de sudo durante la instalación"
fi

# --- 3. Recursos -------------------------------------------------------------
head2 "Recursos"

disk_mb=$(df -Pm . | awk 'NR==2 {print $4}')
if (( disk_mb >= MIN_DISK_MB )); then
    ok "espacio libre: ${disk_mb} MB"
else
    bad "espacio libre: ${disk_mb} MB (se necesitan ${MIN_DISK_MB} MB para venv, node_modules y el build)"
fi

ram_mb=$(free -m | awk '/^Mem:/ {print $2}')
if (( ram_mb >= MIN_RAM_MB )); then
    ok "memoria: ${ram_mb} MB"
else
    warn "memoria: ${ram_mb} MB — 'next build' puede quedarse sin memoria; considera swap"
fi

# --- 4. Python ---------------------------------------------------------------
head2 "Python"

# Se aprovecha el intérprete que ya haya, de mayor a menor versión, para no
# acumular instalaciones de Python en el servidor.
# Rutas del sistema explícitas: si un venv está activo, `command -v` daría su
# intérprete y el venv se crearía anidado sobre otro venv.
for candidate in /usr/bin/python3.13 /usr/bin/python3.12 /usr/bin/python3.11 \
                 /usr/local/bin/python3.12 /usr/local/bin/python3.11 /usr/bin/python3; do
    [[ -x "$candidate" ]] || continue
    minor=$("$candidate" -c 'import sys; print(sys.version_info[1])' 2>/dev/null) || continue
    if [[ -n "$minor" ]] && (( minor >= PY_MIN_MINOR )); then
        PY_BIN="$candidate"
        break
    fi
done

if [[ -n "$PY_BIN" ]]; then
    ok "$($PY_BIN --version) en $PY_BIN"
    "$PY_BIN" -c "import venv" >/dev/null 2>&1 \
        && ok "módulo venv disponible" \
        || bad "falta el módulo venv (instalar el paquete -devel del intérprete)"
    printf "  se usará este intérprete; no hace falta instalar otro\n"
else
    sys_ver=$(python3 --version 2>&1 || echo 'ausente')
    bad "no hay Python >= 3.${PY_MIN_MINOR} (el del sistema es ${sys_ver})"
    printf "  opciones en Rocky 8: dnf module enable python311  (o python312)\n"
fi

# --- 5. Node -----------------------------------------------------------------
head2 "Node.js"

if command -v node >/dev/null 2>&1; then
    node_v=$(node --version)
    node_major=$(echo "$node_v" | sed 's/^v//;s/\..*//')
    if (( node_major >= 18 )); then
        ok "Node ${node_v} (Next.js 15 requiere >= 18.18)"
        (( node_major < NODE_MAJOR )) && warn "se recomienda Node ${NODE_MAJOR} LTS"
    else
        bad "Node ${node_v} es demasiado antiguo para Next.js 15 (mínimo 18.18)"
    fi
    command -v npm >/dev/null 2>&1 && ok "npm $(npm --version)" || bad "npm no está instalado"
else
    bad "Node.js no está instalado (se instalará el módulo nodejs:${NODE_MAJOR})"
    dnf module list nodejs 2>/dev/null | grep -q "^nodejs *${NODE_MAJOR}" \
        && ok "el módulo nodejs:${NODE_MAJOR} está disponible" \
        || warn "el módulo nodejs:${NODE_MAJOR} no aparece; se usará el repo de NodeSource"
fi

# --- 6. Cabeceras de compilación --------------------------------------------
head2 "Dependencias de compilación"
# cryptography, PyMySQL y ldap3 compilan extensiones si no hay rueda binaria.
for pkg in gcc openssl-devel libffi-devel; do
    rpm -q "$pkg" >/dev/null 2>&1 && ok "$pkg" || warn "$pkg ausente (lo instala el script)"
done
rpm -q openldap-devel >/dev/null 2>&1 && ok "openldap-devel" \
    || warn "openldap-devel ausente (necesario para ldap3 en algunos casos)"

# --- 7. Servicios de datos ---------------------------------------------------
head2 "Base de datos y Redis"

if command -v mysql >/dev/null 2>&1; then
    ok "cliente mysql presente"
else
    warn "cliente mysql ausente; útil para aplicar las migraciones de utils/migrations"
fi

if [[ -f .env ]]; then
    ok ".env presente"
    db_host=$(grep -E '^DB_HOST=' .env | cut -d= -f2- | tr -d '"'"'"' ')
    db_port=$(grep -E '^DB_PORT=' .env | cut -d= -f2- | tr -d '"'"'"' ')
    db_name=$(grep -E '^DB_NAME=' .env | cut -d= -f2- | tr -d '"'"'"' ')
    : "${db_host:=localhost}"; : "${db_port:=3306}"
    if timeout 5 bash -c "</dev/tcp/${db_host}/${db_port}" 2>/dev/null; then
        ok "base de datos accesible en ${db_host}:${db_port} (${db_name:-sin nombre})"
    else
        bad "no se pudo conectar a la base de datos en ${db_host}:${db_port}"
    fi
    redis_host=$(grep -E '^REDIS_HOST=' .env | cut -d= -f2- | tr -d '"'"'"' ')
    redis_port=$(grep -E '^REDIS_PORT=' .env | cut -d= -f2- | tr -d '"'"'"' ')
    : "${redis_host:=localhost}"; : "${redis_port:=6379}"
    if timeout 5 bash -c "</dev/tcp/${redis_host}/${redis_port}" 2>/dev/null; then
        ok "Redis accesible en ${redis_host}:${redis_port}"
    else
        warn "Redis no responde en ${redis_host}:${redis_port} (la app arranca igual)"
    fi
    grep -qE '^SECRET_KEY=.+' .env \
        && ok "SECRET_KEY definida" \
        || bad "SECRET_KEY sin definir: las sesiones no serían seguras"
else
    bad ".env ausente — copiar de .env.example y rellenar credenciales"
fi

# --- 8. Puertos --------------------------------------------------------------
head2 "Puertos"
for p in "$API_PORT" "$WEB_PORT"; do
    if ss -ltn 2>/dev/null | grep -q ":${p}\b"; then
        who=$(ss -ltnp 2>/dev/null | grep ":${p}\b" | grep -oP 'users:\(\("\K[^"]+' | head -1)
        bad "puerto ${p} ocupado por ${who:-otro proceso}"
    else
        ok "puerto ${p} libre"
    fi
done

# --- 9. Reverse proxy --------------------------------------------------------
head2 "Reverse proxy"
if command -v nginx >/dev/null 2>&1; then
    ok "$(nginx -v 2>&1)"
    nginx -t >/dev/null 2>&1 && ok "configuración actual válida" \
        || warn "'nginx -t' falla ya antes de instalar; revisar la config existente"
    [[ -d /etc/nginx/conf.d ]] && ok "/etc/nginx/conf.d disponible" \
        || warn "no existe /etc/nginx/conf.d"
else
    warn "nginx no está instalado (lo instala el script)"
fi

# --- 10. SELinux y cortafuegos ----------------------------------------------
head2 "SELinux y cortafuegos"
if command -v getenforce >/dev/null 2>&1; then
    mode=$(getenforce)
    printf "  SELinux: %s\n" "$mode"
    if [[ "$mode" == "Enforcing" ]]; then
        # Sin este booleano, nginx recibe 502 al llamar a los upstream locales.
        if command -v getsebool >/dev/null 2>&1 && \
           [[ "$(getsebool httpd_can_network_connect 2>/dev/null)" == *"--> on" ]]; then
            ok "httpd_can_network_connect activo (nginx puede llamar a los servicios)"
        else
            warn "httpd_can_network_connect desactivado: nginx daría 502 al proxy (el script lo activa)"
        fi
    fi
else
    printf "  SELinux: no disponible\n"
fi

if systemctl is-active --quiet firewalld 2>/dev/null; then
    ok "firewalld activo"
    firewall-cmd --list-services 2>/dev/null | grep -qw https \
        && ok "https permitido" \
        || warn "https no está permitido en la zona activa (el script lo añade)"
else
    printf "  firewalld: inactivo\n"
fi

# --- 11. Estado del proyecto -------------------------------------------------
head2 "Proyecto"
[[ -f run.py && -d app ]] && ok "backend presente" || bad "no parece la raíz del proyecto"
[[ -f frontend/package.json ]] && ok "frontend presente" || bad "falta frontend/package.json"
[[ -d venv ]] && warn "existe un venv; se recreará (el de desarrollo no es portable)" \
              || printf "  venv: se creará\n"
[[ -d frontend/node_modules ]] && warn "existe node_modules; 'npm ci' lo reemplazará" \
                              || printf "  node_modules: se instalará\n"

# --- Resumen -----------------------------------------------------------------
printf "\n%sResumen%s\n" "$c_bold" "$c_off"
printf "  bloqueantes: %d   avisos: %d\n" "$problems" "$warnings"
if (( problems > 0 )); then
    printf "\n  %sResolver los puntos marcados FALTA antes de instalar.%s\n" "$c_bad" "$c_off"
    exit 1
fi
printf "\n  %sSe puede continuar:%s sudo ./deploy/install.sh\n" "$c_ok" "$c_off"
exit 0
