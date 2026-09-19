#!/usr/bin/env bash
# Renderiza los diagramas C4 (*.puml) a SVG con la imagen oficial de PlantUML.
# Uso: docs/diagramas/render.sh   (necesita podman o docker; sin Java local)
# La librería C4 viene en la stdlib de PlantUML (!include <C4/...>): no hace
# falta red para renderizar.
set -euo pipefail
cd "$(dirname "$0")"
motor=$(command -v podman || command -v docker)
"$motor" run --rm $( [ "$(basename "$motor")" = podman ] && echo --userns=keep-id ) --user "$(id -u):$(id -g)" \
  -v "$PWD":/data:Z docker.io/plantuml/plantuml:latest -tsvg '/data/c4-*.puml'
ls -1 c4-*.svg
