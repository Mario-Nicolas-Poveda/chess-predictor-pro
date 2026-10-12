# Git Flow · Chess Predictor Pro

Modelo original: Vincent Driessen (2010). El mismo autor aclaró en 2020 que para apps web con despliegue continuo GitHub Flow es más simple, y que Git Flow encaja cuando hay **versiones explícitas**. Aquí sí las hay: **cada sprint es una versión que se presenta y se evalúa**. Por eso Git Flow, adaptado así:

### 2.1 Ramas

| Rama | Sale de | Entra a | Vida | Uso |
|---|---|---|---|---|
| `main` | — | — | permanente | Lo presentado y evaluado. Cada merge = versión con tag |
| `develop` | `main` | — | permanente | Integración del sprint. **Rama por defecto en GitHub** |
| `feature/s<sprint>-<issue>-<slug>` | `develop` | `develop` | 1–3 días | Una tarea = un issue = una rama |
| `release/v0.<sprint>.0` | `develop` | `main` (+ `main`→`develop`) | 1–2 días | Cierre del sprint: solo arreglos, versión, changelog |
| `bugfix/s<sprint>-<issue>-<slug>` | `release/*` | `release/*` | horas | Bug encontrado durante el release |
| `hotfix/v0.<sprint>.<n>` | tag en `main` | `main` (+ `main`→`develop`) | horas | Bug urgente en lo ya presentado |

Ejemplos: `feature/s1-3-auth-api`, `release/v0.1.0`, `hotfix/v0.1.1`.
La rama dice **sprint + issue + función**. El issue dice **dev (assignee) + área (label) + sprint (milestone)**.

### 2.2 Versiones
- Sprint 1 → `v0.1.0`, Sprint 2 → `v0.2.0` … Sprint 6 → `v1.0.0`.
- Hotfix sobre `v0.1.0` → `v0.1.1`.
- `package.json` → `"version"` se sube **solo** en la rama `release/*` o `hotfix/*`.

### 2.3 Decisiones (y por qué)

| Decisión | Por qué |
|---|---|
| `develop` como rama por defecto | Los PR apuntan a `develop` sin pensar, y `Closes #N` cierra el issue al hacer merge (GitHub solo cierra issues con keywords en la rama por defecto) |
| Solo **"Create a merge commit"** (sin squash ni rebase) | Equivale a `--no-ff` de Git Flow: cada feature queda agrupada y se revierte entera. Además evita que `main` y `develop` se desincronicen tras un release |
| Borrar rama al hacer merge (auto) | Ramas cortas; nada viejo colgando |
| Back-merge con PR `main` → `develop` | Con el auto-borrado, la rama `release/*` desaparece al entrar a `main`; el PR `main`→`develop` trae el cierre del release y el bump de versión |
| 1 aprobación obligatoria | Son 2 devs: el autor no puede aprobarse a sí mismo, así que el otro revisa siempre (lo pide la guía) |
| CI obligatorio (`ci`) | Nada entra a `develop` o `main` si no pasa lint, tipos, tests y build |
| Sincronizar con `git merge origin/develop` (no rebase) | La rama ya está en GitHub; rebase obliga a `push --force` |
| Conventional Commits | Historial legible y changelog automático |

### 2.4 Ciclo de una feature
1. Issue asignado (dev + labels + milestone).
2. `gh issue develop <N> --base develop --name feature/s1-<N>-<slug> --checkout` → crea la rama **vinculada al issue** (aparece en "Development" del issue).
3. Commits pequeños. Antes del PR: `git fetch origin && git merge origin/develop`.
4. PR hacia `develop` con `Closes #N`. El otro dev revisa. CI verde.
5. El **autor** hace merge (merge commit). Rama se borra sola. Issue se cierra solo.
6. El otro dev sincroniza su rama: `git fetch origin && git merge origin/develop`.

### 2.5 Ciclo de cierre de sprint (release)
1. Todo el sprint mergeado en `develop`.
2. `git switch develop && git pull && git switch -c release/v0.1.0`.
3. Subir versión (`npm version 0.1.0 --no-git-tag-version`) + `CHANGELOG.md`.
4. Bugs → `bugfix/s1-<N>-<slug>` desde el release → PR al release.
5. PR `release/v0.1.0` → `main`. Aprobado + CI → merge.
6. Tag en `main`: `git switch main && git pull && git tag -a v0.1.0 -m "Sprint 1: auth, dashboard y perfil" && git push origin v0.1.0`.
7. `gh release create v0.1.0 --generate-notes --title "v0.1.0 · Sprint 1"`.
8. PR `main` → `develop` ("chore: sincronizar main en develop tras v0.1.0") → merge.

### 2.6 Commits y PRs

Commit (Conventional Commits 1.0):
```
<tipo>(<ámbito>): <qué hace, imperativo, minúscula, sin punto>

<por qué / detalle opcional>

Refs #<issue>
```
Tipos: `feat` `fix` `refactor` `test` `docs` `chore` `ci` `style` `build` `perf`.
Ámbitos: `repo` `ci` `core` `db` `auth` `profile` `oauth` `ui` `landing` `dashboard` `release`.

Título de PR = mismo formato. Cuerpo = plantilla `.github/pull_request_template.md` con `Closes #N`.
