#!/usr/bin/env bash
# Revisa la rama destino y la descripción de un PR (Git Flow del proyecto).
# Entradas por variables de entorno: HEAD_REF, BASE_REF, PR_BODY. Sale con 1 si algo no cumple.
set -uo pipefail
fail=0
err() { echo "::error::$1"; fail=1; }
backmerge=false

case "$HEAD_REF" in
  feature/*) [[ "$BASE_REF" == develop ]]   || err "Una rama feature/* va contra develop (este PR va contra $BASE_REF)." ;;
  bugfix/*)  [[ "$BASE_REF" == release/* ]] || err "Una rama bugfix/* va contra la rama release/* abierta (este PR va contra $BASE_REF)." ;;
  hotfix/*)  [[ "$BASE_REF" == main ]]      || err "Un hotfix/* sale de main y vuelve a main (este PR va contra $BASE_REF). Después va el back-merge main → develop." ;;
  release/*) [[ "$BASE_REF" == main ]]      || err "Un release/* va contra main (este PR va contra $BASE_REF)." ;;
  # chore/backmerge-*: el back-merge con conflictos, que no se pueden resolver en main porque está protegida
  main|chore/backmerge-*)
    backmerge=true
    [[ "$BASE_REF" == develop ]] || err "Un back-merge va contra develop (este PR va contra $BASE_REF)." ;;
  *)         err "Rama '$HEAD_REF' fuera de Git Flow: usa feature/, bugfix/, hotfix/ o release/." ;;
esac

if [[ "$backmerge" == false ]]; then   # un back-merge solo sincroniza: no lleva issue ni descripción larga
  # Texto útil de la descripción: sin comentarios de la plantilla, títulos, casillas vacías ni líneas en blanco
  useful=$(printf '%s' "${PR_BODY:-}" | tr -d '\r' | perl -0pe 's/<!--.*?-->//gs' \
    | grep -vE '^\s*(#|- \[ \]|\*\*[^*]+:\*\*\s*$|---\s*$)' | grep -vE '^\s*$' || true)
  chars=$(printf '%s' "$useful" | tr -d '[:space:]' | wc -c | tr -d ' ')
  if [[ "$chars" -lt 60 ]]; then
    err "La descripción está vacía o solo tiene la plantilla ($chars caracteres útiles). Llénala desde .pr/PR-<n>.md con gh pr edit <n> --body-file .pr/PR-<n>.md"
  fi
  if [[ "$HEAD_REF" != release/* ]]; then
    printf '%s' "${PR_BODY:-}" | grep -qiE '(closes|fixes|resolves|refs) #[0-9]+' \
      || err "Falta el issue: agrega 'Closes #<n>' (o 'Refs #<n>' si no lo cierra)."
  fi
fi
if printf '%s' "${PR_BODY:-}" | grep -qiE 'co-authored-by|generated with'; then
  err "Sin atribución en los PR: quita 'Co-Authored-By' o 'Generated with'."
fi

[[ $fail -eq 0 ]] && echo "PR OK: $HEAD_REF → $BASE_REF."
exit $fail
