# Changelog
Formato: Keep a Changelog. Versiones: una por sprint.

## [Unreleased]

## [0.1.0] - 2026-10-12
Sprint 1 · Auth, Dashboard y Perfil.

### Añadido
- Registro e inicio de sesión con correo y contraseña (JWT en cookie httpOnly) (#3)
- Inicio de sesión con Google (OAuth 2.0) (#5)
- Perfil con estadísticas en 0 y ELO 1200; edición de datos básicos (#4, #9)
- Protección de rutas del dashboard con `proxy.ts` (#4)
- Landing con recorrido 3D (#7)
- Shell del dashboard con barra superior (#6)
- Pantallas de login y registro (#8)
- Sesión en la UI: menú de usuario, cierre de sesión, redirección ante 401 y ajustes móviles (#10)
- Núcleo compartido: env validado, errores uniformes, cliente Supabase, contratos Zod y migración `users` + `user_stats` (#2)
- Estructura del repositorio, CI y Git Flow (#1)
