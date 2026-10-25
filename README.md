# Chess Predictor Pro

Proyecto de Programación Web 2026-2. Sprint 1: autenticación (JWT y Google), dashboard, perfil y landing 3D.

## Stack
Next.js (App Router) · TypeScript estricto · Tailwind v4 · Zod · Supabase (Postgres) · JWT (jose) · OAuth 2.0 Google.

## Cómo correr
```bash
npm i
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
npm run dev                  # http://localhost:3000
```

Después de clonar, activa el hook de commits una vez:
```bash
git config core.hooksPath .githooks
```

## Limpiar usuarios de prueba
Los scripts `tests/*.http.sh` crean usuarios (`@t.dev`, `@test.dev`) en la única base de Supabase. Bórralos **antes de cada demo y antes del ranking del Sprint 6** con [`supabase/cleanup_test_users.sql`](supabase/cleanup_test_users.sql) en el SQL Editor:
1. Selecciona el bloque 1 (vista previa) y pulsa Run. `partidas_con_cuentas_reales` debe ser 0.
2. Corre el archivo completo. Si alguna prueba jugó contra una cuenta real, no borra nada.
3. Si la vista previa lista fotos, bórralas en Storage → `avatars`.

## Git Flow
Ramas, versiones, commits y PRs: [docs/git-flow.md](docs/git-flow.md).

## Equipo
- Mario · Dev 1 · Backend
- Jose · Dev 2 · Frontend
