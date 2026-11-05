#!/usr/bin/env bash
# Ranking y torneos de punta a punta (Git Bash): 200, 201, 204, 304, 400, 401, 404, 405 y 409.
# Necesita ENABLE_DEV_ROUTES=true (el torneo se crea con POST /dev/tournaments). Tarda ≈ 45 s.
# Juega un torneo de 4: una partida se gana por abandono, otra por W.O. (plazo de 6 s) y la final.
set -e
B=${B:-http://localhost:3000/api/v1}; R=$RANDOM; D=$(mktemp -d)
trap 'rm -rf "$D"' EXIT
j()    { curl -s -H 'content-type: application/json' "$@"; echo; }
st()   { curl -s -o /dev/null -w '%{http_code}\n' -H 'content-type: application/json' "$@"; }
code() { grep -o '"code":"[A-Z_]*"' | head -1; }
reg()  { j -c "$D/$1" -X POST "$B/auth/register" -d "{\"email\":\"t$1$R@t.dev\",\"username\":\"tour_$1$R\",\"password\":\"Clave1234\"}" >/dev/null; }
# tr: según el curl, las cabeceras llegan con \r\n o solo con \n
etag_of() { curl -s -D - -o /dev/null -b "$D/$1" "$2" | tr -d '\r' | sed -n 's/^[Ee][Tt]ag: *//p'; }
next_of() { j -b "$D/$1" "$B/tournaments" | grep -o '"next":{"tournamentId":"[^"]*","tournamentName":"[^"]*","matchId":"[^"]*"' | cut -d'"' -f14; }
color_of(){ j -b "$D/$1" "$B/tournaments" | grep -o '"color":"[a-z]*"' | head -1 | cut -d'"' -f4; }
for u in a b c d e; do reg "$u"; done

echo "== 400 orden inválido";          j -b "$D/a" "$B/ranking?sort=edad" | code
echo "== 200 ranking";                 j -b "$D/a" "$B/ranking?limit=3" | grep -o '"needed":[0-9]*'
E=$(etag_of a "$B/ranking?limit=3")
echo "== 304 ranking (forma débil)";   st -b "$D/a" -H "If-None-Match: W/$E" "$B/ranking?limit=3"
echo "== 401 sin sesión";              st "$B/ranking"

T=$(j -b "$D/a" -X POST "$B/dev/tournaments" -d '{"name":"Prueba http","size":4,"timeControl":"3+2","startsInS":20,"noshowS":6}' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "torneo $T (empieza en 20 s: margen para inscribir con la BD lejos; W.O. a los 6 s)"
echo "== 404 torneo que no existe";    j -b "$D/a" "$B/tournaments/00000000-0000-4000-8000-000000000000" | code
echo "== 400 id que no es uuid";       st -b "$D/a" "$B/tournaments/hola"
echo "== 201 inscribirse + Location";  curl -s -D - -o /dev/null -b "$D/a" -X POST "$B/tournaments/$T/registration" | grep -iE '^HTTP|^location'
echo "== 200 otra vez (idempotente)";  st -b "$D/a" -X POST "$B/tournaments/$T/registration"
echo "== 200 mi inscripción";          st -b "$D/a" "$B/tournaments/$T/registration"
for u in b c d; do st -b "$D/$u" -X POST "$B/tournaments/$T/registration" >/dev/null; done
echo "== 409 lleno";                   j -b "$D/e" -X POST "$B/tournaments/$T/registration" | code
echo "== 404 salir sin estar";         j -b "$D/e" -X DELETE "$B/tournaments/$T/registration" | code
echo "== 204 salir";                   st -b "$D/d" -X DELETE "$B/tournaments/$T/registration"
echo "== 201 entra el quinto";         st -b "$D/e" -X POST "$B/tournaments/$T/registration"
echo "== 405 PUT";                     st -b "$D/a" -X PUT "$B/tournaments/$T/registration"
E=$(etag_of a "$B/tournaments/$T")
echo "== 304 llave sin cambios";       st -b "$D/a" -H "If-None-Match: $E" "$B/tournaments/$T"
for _ in $(seq 1 30); do j -b "$D/a" "$B/tournaments/$T" | grep -q '"status":"running"' && break; sleep 1; done   # empieza al leerlo después de la hora
echo "== en juego";                    j -b "$D/a" "$B/tournaments/$T" | grep -o '"status":"running"' | head -1
# Siembras con el mismo ELO: por orden de llegada → a(1) vs e(4) y b(2) vs c(3). Blancas: la mejor siembra.
# Las dos semifinales se leen ya: el plazo del W.O. corre desde que empezó el torneo
M1=$(next_of a); M2=$(next_of b)
echo "== 409 inscribirse tarde";       j -b "$D/d" -X POST "$B/tournaments/$T/registration" | code
echo "== 409 salir tarde";             j -b "$D/a" -X DELETE "$B/tournaments/$T/registration" | code

echo "semifinal 1 $M1 · a juega con $(color_of a)"
echo "== 201 primera jugada de a";     st -b "$D/a" -X POST "$B/matches/$M1/moves" -d '{"uci":"e2e4","ply":0}'
echo "== e se rinde";                  st -b "$D/e" -X POST "$B/matches/$M1/resign"
echo "== 409 revancha en torneo";      j -b "$D/a" -X POST "$B/matches/$M1/rematch" | code
echo "semifinal 2 $M2 · b no juega (W.O. a los 6 s)"
sleep 7
echo "== W.O.";                        j -b "$D/c" "$B/matches/$M2/state" | grep -o '"reason":"noshow"'
F=$(next_of a); echo "final $F · a con $(color_of a)"
echo "== 201 primera jugada de la final"; st -b "$D/a" -X POST "$B/matches/$F/moves" -d '{"uci":"d2d4","ply":0}'
echo "== c se rinde";                  st -b "$D/c" -X POST "$B/matches/$F/resign"
echo "== terminado y campeón";         j -b "$D/a" "$B/tournaments/$T" | grep -o '"status":"finished"\|"winner":{"id":"[^"]*","username":"[^"]*"' | head -2
