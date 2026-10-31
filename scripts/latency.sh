#!/usr/bin/env bash
# Latencia de la API vista desde aquí: TTFB (red + servidor) y lo que tardó el servidor (cabecera Server-Timing).
# Uso:  bash scripts/latency.sh [ruta=/profile] [veces=20]
#       B=https://<preview>.vercel.app/api/v1 bash scripts/latency.sh "/matches?limit=10" 30
# Crea un usuario de prueba para tener sesión (igual que tests/*.http.sh).
set -euo pipefail
B=${B:-http://localhost:3000/api/v1}; P=${1:-/profile}; N=${2:-20}
J=$(mktemp); T=$(mktemp); A=$(mktemp); R=$RANDOM
trap 'rm -f "$J" "$T" "$A"' EXIT
curl -s -o /dev/null -c "$J" -H 'content-type: application/json' -X POST "$B/auth/register" \
  -d "{\"email\":\"lat$R@t.dev\",\"username\":\"lat_t$R\",\"password\":\"Clave1234\"}"
curl -s -o /dev/null -b "$J" "$B$P"                                     # la primera no cuenta (arranque en frío)
for _ in $(seq 1 "$N"); do
  out=$(curl -s -o /dev/null -D - -b "$J" -w 'TTFB:%{time_starttransfer}\n' "$B$P" | tr -d '\r')
  echo "$out" | sed -n 's/^TTFB://p' | awk '{ printf "%.0f\n", $1 * 1000 }' >> "$T"
  echo "$out" | sed -n 's/^[Ss]erver-[Tt]iming:.*app;dur=\([0-9.]*\).*/\1/p' | awk '{ printf "%.0f\n", $1 }' >> "$A"
done
pct() { sort -n "$1" | awk -v p="$2" '{ v[NR] = $1 } END { if (!NR) { print "—"; exit } i = int(NR * p + 0.999); if (i < 1) i = 1; print v[i] }'; }
echo "$B$P · $N consultas"
printf 'TTFB (red + servidor)  p50 %s ms · p95 %s ms\n' "$(pct "$T" 0.5)" "$(pct "$T" 0.95)"
if [[ -s "$A" ]]; then
  printf 'Servidor (app)         p50 %s ms · p95 %s ms\n' "$(pct "$A" 0.5)" "$(pct "$A" 0.95)"
else
  echo "Sin cabecera Server-Timing: ¿está el cambio de withAuth en esta versión?"
fi
echo "Si 'app' es alto y el código no cambió, mira https://status.supabase.com antes de tocar nada."
