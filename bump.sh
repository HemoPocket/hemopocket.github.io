#!/usr/bin/env bash
# bump.sh — Sube la versión de HemoPocket en UN SOLO paso.
#
# Por qué existe: el número de versión vive en dos archivos (sw.js y HemoPocket_app.html)
# y deben ir SIEMPRE iguales; si se descuadran, los dispositivos dejan de actualizarse.
# Este script los sincroniza automáticamente y pone la fecha de hoy, para no tener que
# escribir el número a mano en varios sitios (fuente de errores).
#
# Uso:
#   ./bump.sh         -> incrementa el build en 1 (lo normal en cada cambio)
#   ./bump.sh 90      -> fija el build a 90
#
# Marcadores que toca:
#   - sw.js                : const CACHE = 'hemopocket-vNN'
#   - HemoPocket_app.html  : const HP_BUILD = NN            (única fuente de verdad del HTML;
#                            APP_BUILD se deriva de HP_BUILD, así que no hay que tocarlo)
#   - HemoPocket_app.html  : fecha dentro de APP_BUILD       (se pone la de hoy)
set -euo pipefail
cd "$(dirname "$0")"

HTML="HemoPocket_app.html"
SW="sw.js"

cur=$(grep -oE "hemopocket-v[0-9]+" "$SW" | head -1 | grep -oE "[0-9]+")
if [ "${1:-}" ]; then next="$1"; else next=$((cur + 1)); fi
today=$(date +%Y.%m.%d)

# 1) Versión del service worker (CACHE)
sed -i -E "s/hemopocket-v[0-9]+/hemopocket-v${next}/g" "$SW"

# 2) Número de build en el HTML (única fuente de verdad)
sed -i -E "s/const HP_BUILD = [0-9]+;/const HP_BUILD = ${next};/" "$HTML"

# 3) Fecha mostrada en APP_BUILD (el número se deriva de HP_BUILD, no se toca aquí)
sed -i -E "s/(const APP_BUILD = ')[0-9]{4}\.[0-9]{2}\.[0-9]{2}( \(build )/\1${today}\2/" "$HTML"

echo "HemoPocket: build ${cur} -> ${next}  (fecha ${today})"
echo "Sincronizado: sw.js (hemopocket-v${next}) y HemoPocket_app.html (HP_BUILD=${next})."
