#!/usr/bin/env bash
# Invitado de punta a punta: 200, 201, 204, 400, 401, 403, 409. Con npm start (o B= de un preview).
set -e
B=${B:-http://localhost:3000/api/v1}; R=$RANDOM; D=$(mktemp -d)
trap 'rm -rf "$D"' EXIT
j()    { curl -s -H 'content-type: application/json' "$@"; echo; }
st()   { curl -s -o /dev/null -w '%{http_code}\n' -H 'content-type: application/json' "$@"; }
code() { grep -o '"code":"[A-Z_]*"' | head -1; }

echo "== 201 entrar como invitado + Location"; curl -s -D - -o /dev/null -c "$D/g" -X POST "$B/auth/guest" | grep -iE '^HTTP|^location'
echo "== 200 otra vez (no crea otro)";       st -b "$D/g" -X POST "$B/auth/guest"
echo "== me";                                j -b "$D/g" "$B/auth/me" | grep -o '"role":"guest"\|"guestExpiresAt":"[^"]*"'
M=$(j -b "$D/g" -X POST "$B/ai/games" -d '{"level":1,"color":"white"}' | grep -o '"id":"[^"]*"' | head -1 | cut -d\" -f4)
echo "== 201 contra la IA: $M"
echo "== 200 ranking y torneos";             st -b "$D/g" "$B/ranking"; st -b "$D/g" "$B/tournaments"
echo "== 403 emparejamiento";                j -b "$D/g" -X POST "$B/matchmaking/queue" -d '{"timeControl":"5+0"}' | code
echo "== 403 entrenador";                    j -b "$D/g" "$B/coach/summary" | code
echo "== 403 editar perfil";                 j -b "$D/g" -X PATCH "$B/profile" -d '{"bio":"hola"}' | code
echo "== 400 convertir sin datos";           j -b "$D/g" -X POST "$B/auth/guest/upgrade" -d '{}' | code
j -c "$D/p" -X POST "$B/auth/register" -d "{\"email\":\"rol$R@t.dev\",\"username\":\"rol_p$R\",\"password\":\"Clave1234\"}" >/dev/null
echo "== 409 correo tomado";                 j -b "$D/g" -X POST "$B/auth/guest/upgrade" -d "{\"email\":\"rol$R@t.dev\",\"username\":\"rol_g$R\",\"password\":\"Clave1234\"}" | code
echo "== 200 convertir";                     j -b "$D/g" -c "$D/g" -X POST "$B/auth/guest/upgrade" -d "{\"email\":\"rolg$R@t.dev\",\"username\":\"rol_g$R\",\"password\":\"Clave1234\"}" | grep -o '"role":"player"'
echo "== 409 convertir otra vez";            j -b "$D/g" -X POST "$B/auth/guest/upgrade" -d "{\"email\":\"x$R@t.dev\",\"username\":\"x$R\",\"password\":\"Clave1234\"}" | code
echo "== 200 su partida sigue (misma cuenta)"; st -b "$D/g" "$B/matches/$M/state"
echo "== ya no es 403 (jugador)";            j -b "$D/g" "$B/coach/summary" | code; echo "(sin ACCOUNT_REQUIRED arriba = bien)"
curl -s -o /dev/null -c "$D/h" -X POST "$B/auth/guest"; cp "$D/h" "$D/h2"
echo "== 204 cerrar sesión de invitado";     st -b "$D/h" -X POST "$B/auth/logout"
sleep 1
echo "== 401 SESSION_EXPIRED con su token";  j -b "$D/h2" "$B/auth/me" | code
