# Changelog
Formato: Keep a Changelog. Versiones: una por sprint.

## [Unreleased]

## [0.4.1] - 2026-10-31
### Seguridad
- Límite de intentos al iniciar sesión (por IP y por correo) y al registrarse (por IP): 429 con `Retry-After` (#146)

## [0.4.0] - 2026-10-29
Sprint 4 · IA.

### Añadido
- Contra la IA: cinco niveles (Peón a Dama), con blancas, negras o al azar, con o sin reloj; no cambia el ELO (#92, #94, #100)
- Motor de IA propio: negamax con poda alfa-beta, quiescencia y profundidad iterativa (#93)
- Predicción: ventaja y tus tres mejores jugadas con flechas; pista (#94, #101)
- Deshacer tu jugada contra la IA (#94, #101)
- Modo enfoque en la partida (sin menú de módulos) y panel plegable (#97)
- Tablero 3D o 2D, guardado en tus preferencias (#99)
- Foto de perfil con recorte (#95, #102)
- Timbre en tiempo real: la jugada del rival llega al instante (#96, #104)
- Códigos nuevos: 413 y 429 (#94, #95)

### Cambiado
- 401 en vez de 404 cuando el usuario de la sesión ya no existe (#127)
- CI con las acciones en Node 24 y runner fijo `ubuntu-24.04` (#124)

### Corregido
- Coronar a torre, alfil o caballo ya no deja la partida bloqueada (v0.3.1, #91)
- El 3D se ve nítido en el celular; la repetición en móvil ya no dibuja la jugada encima del tablero (#98)
- El tablero ya no se mueve con el mouse; sin "(tú)" junto al nombre
- Personalizar y los demás paneles se cierran tocando fuera (#103)
- La revancha pedida después de 2 minutos aparece sin recargar (#89)
- El resultado ya no tiene scroll horizontal en el celular (#131)
- Script para borrar los usuarios de prueba de Supabase (#90)

## [0.3.2] - 2026-10-25
### Seguridad
- Next 16.4.3: corrige dos ejecuciones remotas de código y un DoS de Next 16.4.0 (#118)

## [0.3.1] - 2026-10-21
### Corregido
- Coronar a torre, alfil o caballo ya no deja la partida bloqueada con un jaque que no existe (#91)
- 422 PROMOTION_REQUIRED cuando la jugada de coronación no dice la pieza (#91)

## [0.3.0] - 2026-10-19
Sprint 3 · Arena.

### Añadido
- Arena: partida en vivo con tablero 3D, reglas validadas en el servidor, relojes con incremento y escribir la jugada (#57, #58, #61, #62)
- Final por jaque mate, abandono, tiempo, tablas por acuerdo, rey ahogado, material insuficiente, triple repetición y 50 jugadas (#57, #58, #62)
- ELO (K = 32) y estadísticas actualizados al terminar (#57)
- Pantalla de resultado con cambio de ELO y revancha (#60, #63)
- Partidas: historial filtrable y repetición jugada a jugada (#60, #64)
- Perfil con evolución de ELO y últimas partidas reales (#60, #64)
- Bots de desarrollo que juegan y contestan tablas (#59)
- Códigos nuevos: 202, 304 y 422 (#58)

### Corregido
- Abandonar solo partidas pendientes, sin carreras (#52)
- Los 400 dicen qué campo falló (#53)
- Rendimiento: arranque del 3D sin bloquear, three 0.186 con `compileAsync`, modo ligero en móvil y login sin saltos de diseño (#54, #55, #56, #78)
- `tests/arena.http.sh` lee el ETag también en Git Bash (#76)

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
