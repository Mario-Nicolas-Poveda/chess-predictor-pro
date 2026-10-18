#!/usr/bin/env bash
set -e
B=${B:-http://localhost:3000/api/v1}; J1=$(mktemp); J2=$(mktemp); J3=$(mktemp); R=$RANDOM
j()  { curl -s -H 'content-type: application/json' "$@"; echo; }
st() { curl -s -o /dev/null -w '%{http_code}\n' "$@"; }

echo "== registrar tres jugadores"
j -c $J1 -X POST $B/auth/register -d "{\"email\":\"p1$R@t.dev\",\"username\":\"p1_$R\",\"password\":\"Clave1234\"}"
j -c $J2 -X POST $B/auth/register -d "{\"email\":\"p2$R@t.dev\",\"username\":\"p2_$R\",\"password\":\"Clave1234\"}"
j -c $J3 -X POST $B/auth/register -d "{\"email\":\"p3$R@t.dev\",\"username\":\"p3_$R\",\"password\":\"Clave1234\"}"

echo "== 415 sin JSON";                  st -b $J1 -X POST $B/matchmaking/queue -d 'timeControl=10+0'
echo "== 400 JSON roto";                 j  -b $J1 -X POST $B/matchmaking/queue -d '{malo'
echo "== 400 ritmo inválido";            j  -b $J1 -X POST $B/matchmaking/queue -d '{"timeControl":"1+0"}'
echo "== 404 salir sin estar";           st -b $J1 -X DELETE $B/matchmaking/queue
echo "== 201 p1 entra";                  j  -b $J1 -X POST $B/matchmaking/queue -d '{"timeControl":"10+0"}'
echo "== 409 p1 entra otra vez";         j  -b $J1 -X POST $B/matchmaking/queue -d '{"timeControl":"10+0"}'
echo "== 200 p1 buscando";               j  -b $J1 $B/matchmaking/status
echo "== 200 stats";                     j  -b $J1 $B/matchmaking/stats
echo "== 201 p2 entra";                  j  -b $J2 -X POST $B/matchmaking/queue -d '{"timeControl":"10+0"}'
echo "== 200 p2 emparejado";             S=$(curl -s -b $J2 $B/matchmaking/status); echo "$S"
M=$(echo "$S" | sed -n 's/.*"match":{"id":"\([^"]*\)".*/\1/p')
echo "== 200 p1 ve la misma partida";    j  -b $J1 $B/matches/$M
echo "== 403 p3 ve una partida ajena";   j  -b $J3 $B/matches/$M
echo "== 400 id inválido (fields.id)";   j  -b $J1 $B/matches/abc
echo "== 404 partida inexistente";       j  -b $J1 $B/matches/00000000-0000-4000-8000-000000000000
echo "== 409 entrar con partida abierta"; j -b $J1 -X POST $B/matchmaking/queue -d '{"timeControl":"10+0"}'
echo "== carrera: un 204 y un 409";      ( st -b $J1 -X DELETE $B/matches/$M & st -b $J2 -X DELETE $B/matches/$M & wait ) | sort
echo "== 404 ruta inexistente";          j  -b $J1 $B/no-existe
echo "== 401 sin sesión";                j  $B/matchmaking/status
rm -f $J1 $J2 $J3
