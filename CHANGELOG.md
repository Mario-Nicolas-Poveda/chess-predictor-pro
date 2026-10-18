# Changelog
Formato: Keep a Changelog. Versiones: una por sprint.

## [Unreleased]

## [0.2.1] - 2026-10-18
### Eliminado
- Guías de sprint (`docs/sprints/`) fuera del repositorio; quedan en local e ignoradas por Git (#51)

## [0.2.0] - 2026-10-17
Sprint 2 · Matchmaking.

### Añadido
- Matchmaking: elegir ritmo, buscar rival con ventana de ELO creciente y "Partida encontrada" (#25, #26, #31)
- Partidas pendientes visibles para ambos jugadores y abandonables (#26)
- Catálogo de códigos HTTP: 201 con Location, 204 sin cuerpo, 400, 401, 403, 404, 409, 415 y 503 (#24)
- Bots de prueba solo en desarrollo (#27)
- Perfil personalizable guardado en la cuenta: tema, acento, pieza 3D, material, encabezado, orden y visibilidad de secciones (#28, #34)
- Kit 3D compartido con three.js y escenas en Jugar (#30, #31), login (#32) y perfil (#33)
- Evolución de Elo bajo demanda con un botón (#33)

### Cambiado
- Navegación en cabecera superior; sistema visual v2 con temas (#29)
- Landing 3D sobre el kit compartido, más ligera (#35)

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
