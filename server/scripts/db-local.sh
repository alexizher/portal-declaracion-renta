#!/usr/bin/env bash
# Base de datos MariaDB local para desarrollo, en contenedor podman.
# Uso:
#   ./scripts/db-local.sh          # crea (si no existe) y arranca
#   ./scripts/db-local.sh parar    # detiene el contenedor
#   ./scripts/db-local.sh borrar   # elimina contenedor y datos
#
# Credenciales (coinciden con .env.example):
#   host 127.0.0.1, puerto 3307, db renta, usuario renta, clave renta_dev

set -euo pipefail

NOMBRE=renta-db
PUERTO=3307

case "${1:-arrancar}" in
  parar)
    podman stop "$NOMBRE"
    ;;
  borrar)
    podman rm -f "$NOMBRE" 2>/dev/null || true
    podman volume rm -f "${NOMBRE}-datos" 2>/dev/null || true
    echo "Contenedor y datos eliminados."
    ;;
  arrancar)
    if podman container exists "$NOMBRE"; then
      podman start "$NOMBRE"
    else
      podman run -d --name "$NOMBRE" \
        -e MARIADB_DATABASE=renta \
        -e MARIADB_USER=renta \
        -e MARIADB_PASSWORD=renta_dev \
        -e MARIADB_ROOT_PASSWORD=root_dev \
        -p "$PUERTO":3306 \
        -v "${NOMBRE}-datos":/var/lib/mysql \
        docker.io/library/mariadb:11
    fi
    echo "MariaDB local lista en 127.0.0.1:$PUERTO (db: renta, usuario: renta)"
    ;;
  *)
    echo "Uso: $0 [arrancar|parar|borrar]" >&2
    exit 1
    ;;
esac
