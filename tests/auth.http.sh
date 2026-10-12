#!/usr/bin/env bash
set -e
B=${B:-http://localhost:3000/api/v1}; J=$(mktemp); U="u$RANDOM"
j() { curl -s -H 'content-type: application/json' "$@"; echo; }
echo "== health";         j $B/health
echo "== register 201";   j -c $J -X POST $B/auth/register -d "{\"email\":\"$U@test.dev\",\"username\":\"$U\",\"password\":\"Clave1234\"}"
echo "== register 409";   j -X POST $B/auth/register -d "{\"email\":\"$U@test.dev\",\"username\":\"x$U\",\"password\":\"Clave1234\"}"
echo "== register 400";   j -X POST $B/auth/register -d '{"email":"malo","username":"a","password":"123"}'
echo "== me";             j -b $J $B/auth/me
# --- desde Fase 3 (perfil) ---
echo "== logout 204";     curl -s -o /dev/null -w '%{http_code}\n' -b $J -c $J -X POST $B/auth/logout
echo "== me 401";         j -b $J $B/auth/me
echo "== login demo";     j -X POST $B/auth/login -d '{"email":"demo@chesspredictor.dev","password":"Demo1234"}'
echo "== login 401";      j -X POST $B/auth/login -d '{"email":"demo@chesspredictor.dev","password":"mala1234"}'
rm -f $J
