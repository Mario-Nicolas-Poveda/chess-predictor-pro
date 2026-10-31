#!/usr/bin/env bash
# Casos de scripts/check-pr.sh: bash tests/check-pr.sh
BODY='Agrega la revisión automática de los PR para que no entren vacíos ni contra la rama equivocada.

Closes #136'
TEMPLATE=$(cat .github/pull_request_template.md)
bad=0

check() {   # check <pass|fail> <rama> <destino> <cuerpo> <qué debe decir el error, si falla>
  local out rc
  out=$(HEAD_REF=$2 BASE_REF=$3 PR_BODY=$4 bash scripts/check-pr.sh 2>&1); rc=$?
  if { [ "$1" = pass ] && [ $rc -ne 0 ]; } || { [ "$1" = fail ] && { [ $rc -eq 0 ] || ! grep -q "$5" <<<"$out"; }; }; then
    echo "MAL: $2 → $3 debía dar $1 ${5:+($5)}"; echo "$out"; bad=1
  else
    echo "ok   $1 · $2 → $3 ${5:+· $5}"
  fi
}

check pass feature/s5-136-x   develop      "$BODY"
check pass bugfix/s5-1-x      release/v0.5.0 "$BODY"
check pass hotfix/s5-146-x    main         "$BODY"
check pass release/v0.5.0     main         'Cierre del sprint 5: versión 0.5.0, changelog e integración probada en producción.'
check pass main               develop      'Back-merge de main tras v0.4.1.'
check pass chore/backmerge-v0.3.2 develop  'Conflictos resueltos.'
check pass feature/s5-136-x   develop      'Agrega la revisión automática de los PR para que no entren vacíos a develop.

Refs #136'
check fail feature/s5-136-x   develop      ''            'vacía'
check fail feature/s5-136-x   develop      "$TEMPLATE"   'vacía'
check fail feature/s5-136-x   develop      'Agrega la revisión automática de los PR para que no entren vacíos a develop.' 'Falta el issue'
check fail feature/s5-136-x   main         "$BODY"       'va contra develop'
check fail hotfix/s5-146-x    develop      "$BODY"       'vuelve a main'
check fail bugfix/s4-89-x     develop      "$BODY"       'release'
check fail release/v0.5.0     develop      "$BODY"       'va contra main'
check fail main               release/v0.5.0 'Back-merge.' 'back-merge va contra develop'
check fail chore/next-16.4.3  develop      "$BODY"       'fuera de Git Flow'
check fail feature/s5-136-x   develop      "$BODY

Co-Authored-By: alguien"                                  'Sin atribución'
check fail main               develop      'Generated with algo'  'Sin atribución'

[ $bad -eq 0 ] && echo "check-pr: todo bien"
exit $bad
