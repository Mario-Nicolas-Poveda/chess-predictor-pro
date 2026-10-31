#!/usr/bin/env bash
# AI Coach de punta a punta (Git Bash): 202 + Location, polling con ETag (304), 200, 204, 400, 401, 403, 404, 405, 409 y 422.
# Juega partidas cortas contra la IA (nivel 1) con la jugada que sugiere el motor. FULL=1 prueba también el plan (≈ 2 min).
set -e
B=${B:-http://localhost:3000/api/v1}; J=$(mktemp); K=$(mktemp); R=$RANDOM
trap 'rm -f "$J" "$K"' EXIT
j()     { curl -s -H 'content-type: application/json' "$@"; echo; }
st()    { curl -s -o /dev/null -w '%{http_code}\n' "$@"; }
code()  { grep -o '"code":"[A-Z_]*"' | head -1; }
state() { curl -s -b "$J" "$B/matches/$1/state"; }
ply_of(){ state "$1" | grep -o '"ply":[0-9]*' | head -1 | cut -d: -f2; }
fen_of(){ state "$1" | grep -o '"fen":"[^"]*"' | head -1 | cut -d'"' -f4; }
new_game() { j -b "$J" -X POST "$B/ai/games" -d '{"level":1,"color":"white","timeControl":"none","prediction":false}' | grep -o '"state":{"id":"[^"]*"' | cut -d'"' -f6; }
your_turn() { local P; for _ in $(seq 1 20); do P=$(ply_of "$1"); [ $((P % 2)) -eq 0 ] && break; sleep 0.5; done; echo "$P"; }
play() {   # play <partida> <n>: n jugadas tuyas con blancas; espera la respuesta de la IA a cada una
  local M=$1 P F U
  for _ in $(seq 1 "$2"); do
    P=$(your_turn "$M"); F=$(fen_of "$M")
    U=$(j -b "$J" -X POST "$B/ai/move" -d "{\"fen\":\"$F\",\"level\":1}" | grep -o '"uci":"[a-h1-8qrbn]*"' | cut -d'"' -f4)
    st -b "$J" -H 'content-type: application/json' -X POST "$B/matches/$M/moves" -d "{\"uci\":\"$U\",\"ply\":$P}" >/dev/null
  done
  your_turn "$M" >/dev/null
}
wait_ready() {   # wait_ready <url>: hasta 40 s
  local S; for _ in $(seq 1 27); do S=$(j -b "$J" "$1" | grep -o '"status":"[a-z]*"' | head -1); [ "$S" = '"status":"ready"' ] && break; sleep 1.5; done; echo "$S"
}
etag_of() { curl -s -D - -o /dev/null -b "$J" "$1" | tr -d '\r' | sed -n 's/^[Ee][Tt]ag: *//p'; }

j -c "$J" -X POST "$B/auth/register" -d "{\"email\":\"co$R@t.dev\",\"username\":\"coach_t$R\",\"password\":\"Clave1234\"}" >/dev/null
j -c "$K" -X POST "$B/auth/register" -d "{\"email\":\"cu$R@t.dev\",\"username\":\"coach_u$R\",\"password\":\"Clave1234\"}" >/dev/null

echo "== 404 partida que no existe";        j -b "$J" -X POST "$B/matches/00000000-0000-4000-8000-000000000000/review" | code
echo "== 400 id que no es uuid";             st -b "$J" -X POST "$B/matches/hola/review"
A=$(new_game); echo "partida corta $A"
echo "== 409 todavía en juego";              j -b "$J" -X POST "$B/matches/$A/review" | code
play "$A" 1; j -b "$J" -X POST "$B/matches/$A/resign" >/dev/null
echo "== 422 muy corta (2 medias jugadas)";  j -b "$J" -X POST "$B/matches/$A/review" | grep -o '"code":"[A-Z_]*"\|"minPlies":[0-9]*'

M=$(new_game); echo "partida $M"; play "$M" 4; j -b "$J" -X POST "$B/matches/$M/resign" >/dev/null
echo "== 404 sin análisis todavía";          j -b "$J" "$B/matches/$M/review" | code
echo "== 202 + Location";                    curl -s -D - -o /dev/null -b "$J" -X POST "$B/matches/$M/review" | grep -iE '^HTTP|^location'
echo "== 202 otra vez (idempotente)";        st -b "$J" -X POST "$B/matches/$M/review"
echo "== 409 borrar mientras se hace";       j -b "$J" -X DELETE "$B/matches/$M/review" | code
echo "== 403 de alguien que no jugó";        j -b "$K" -X POST "$B/matches/$M/review" | code
echo "== listo (máx. 40 s)";                 wait_ready "$B/matches/$M/review"
j -b "$J" "$B/matches/$M/review" | grep -o '"source":"[a-z]*"\|"keyMoments":\[[0-9,]*\]\|"accuracy":[0-9]*' | head -4
E=$(etag_of "$B/matches/$M/review")
echo "== 304 sin cambios";                   st -b "$J" -H "If-None-Match: $E" "$B/matches/$M/review"
echo "== 200 pedir cuando ya está listo";    st -b "$J" -X POST "$B/matches/$M/review"
echo "== insignia en el historial";          j -b "$J" "$B/matches?limit=5" | grep -o '"review":{[^}]*}' | head -1
echo "== Server-Timing";                     curl -s -D - -o /dev/null -b "$J" "$B/matches/$M/review" | grep -i '^server-timing' || echo "(sin cabecera: llega con #136)"
echo "== 422 plan con 1 partida";            j -b "$J" -X POST "$B/coach/summary" | grep -o '"code":"[A-Z_]*"\|"games":[0-9]*'
echo "== 404 todavía sin plan";              j -b "$J" "$B/coach/summary" | code
echo "== 405 PUT";                           st -b "$J" -X PUT "$B/matches/$M/review"
echo "== 204 borrar";                        st -b "$J" -X DELETE "$B/matches/$M/review"
echo "== 404 borrar otra vez";               j -b "$J" -X DELETE "$B/matches/$M/review" | code
echo "== 401 sin sesión";                    st -X POST "$B/matches/$M/review"

if [ "${FULL:-0}" = 1 ]; then
  echo "== plan: 3 partidas analizadas"
  for _ in 1 2 3; do
    G=$(new_game); play "$G" 4; j -b "$J" -X POST "$B/matches/$G/resign" >/dev/null
    st -b "$J" -X POST "$B/matches/$G/review" >/dev/null; wait_ready "$B/matches/$G/review" >/dev/null
  done
  echo "== 202 plan + Location";             curl -s -D - -o /dev/null -b "$J" -X POST "$B/coach/summary" | grep -iE '^HTTP|^location'
  echo "== plan listo";                      wait_ready "$B/coach/summary"
  echo "== 200 plan al día";                 st -b "$J" -X POST "$B/coach/summary"
  E=$(etag_of "$B/coach/summary")
  echo "== 304 plan sin cambios";            st -b "$J" -H "If-None-Match: $E" "$B/coach/summary"
fi
