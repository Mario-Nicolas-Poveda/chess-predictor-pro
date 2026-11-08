# Roles · quién usa cada ruta

Dos roles: **jugador** (`player`, cuenta con correo o Google) e **invitado** (`guest`, entra sin registrarse y vive 7 días).
El rol va firmado en el JWT. `withAuth` está **cerrado por defecto**: una ruta solo deja entrar a invitados si dice `{ allow: 'any' }`.
Un invitado en una ruta de jugadores recibe **403 `ACCOUNT_REQUIRED`**, y uno ya borrado o vencido recibe **401 `SESSION_EXPIRED`**.
Segunda capa: los disparadores de la migración 0010 rechazan a un invitado en partidas con ELO, la cola, los torneos y el entrenador, aunque una ruta se equivoque.

Funciones (`FEATURES` en `src/core/shared/auth/roles.ts`) · ✅ = invitado entra · 🔒 = solo jugadores.

| Método | Ruta | Invitado | Función | Por qué |
|---|---|---|---|---|
| POST | `/auth/register` | — | — | Sin sesión. Si había un invitado, se borra |
| POST | `/auth/login` | — | — | Sin sesión. Si había un invitado, se borra |
| GET | `/auth/oauth/google`, `/auth/oauth/google/callback` | — | — | Sin sesión. Si había un invitado, se borra |
| POST | `/auth/guest` | — | — | La puerta de entrada (sin `withAuth`): 201, o 200 si ya hay sesión |
| POST | `/auth/logout` | — | — | Sin `withAuth`, 204 siempre. Un invitado se borra |
| GET | `/auth/me` | ✅ | — | Su sesión, con `role` y `guestExpiresAt` |
| POST | `/auth/guest/upgrade` | ✅ | — | Pasar a jugador (un jugador recibe 409) |
| GET | `/health` | — | — | Pública |
| GET | `/ai/levels` | ✅ | playAi | Elegir el nivel |
| POST | `/ai/games` | ✅ | playAi | Sin ELO. Invitados: además 20 por red y hora |
| DELETE | `/ai/games/:id` | ✅ | playAi | Salir sin registrar |
| POST | `/ai/move` | 🔒 | — | La app no la usa (la IA juega en el servidor): motor gratis sin partida |
| GET | `/matches/:id/state` | ✅ | playAi | Solo sus partidas (403 si no juega) |
| POST | `/matches/:id/moves` | ✅ | playAi | Ídem |
| DELETE | `/matches/:id/moves/last` | ✅ | playAi | Deshacer contra la IA |
| POST | `/matches/:id/resign` | ✅ | playAi | Rendirse |
| GET | `/matches/:id/prediction` | ✅ | prediction | La barra de probabilidad |
| GET | `/matches` | ✅ | history | Sus partidas |
| GET | `/matches/:id` | ✅ | history | Repetición |
| GET | `/matches/:id/moves/:ply` | ✅ | history | Repetición |
| GET | `/profile/history` | ✅ | history | Su gráfica del panel |
| DELETE | `/matches/:id` | 🔒 | playOnline | Cancelar una partida entre personas |
| POST, DELETE | `/matches/:id/draw-offer` | 🔒 | playOnline | Tablas entre personas |
| POST | `/matches/:id/draw-offer/accept` | 🔒 | playOnline | Ídem |
| POST, DELETE | `/matches/:id/rematch` | 🔒 | playOnline | Revancha con ELO |
| POST, DELETE | `/matchmaking/queue` | 🔒 | playOnline | Emparejamiento con ELO |
| GET | `/matchmaking/status`, `/matchmaking/stats` | 🔒 | playOnline | Ídem |
| GET | `/ranking` | ✅ | ranking | Ver (un invitado no aparece: no tiene partidas con ELO) |
| GET | `/tournaments`, `/tournaments/:id` | ✅ | tournamentsView | Ver torneos y llaves |
| POST, GET, DELETE | `/tournaments/:id/registration` | 🔒 | tournamentsJoin | Un invitado que desaparece deja un W.O. |
| POST, GET, DELETE | `/matches/:id/review` | 🔒 | coach | Gasta el modelo y CPU |
| POST, GET | `/coach/summary` | 🔒 | coach | Ídem |
| GET | `/profile` | ✅ | — | Su panel |
| GET, PUT, DELETE | `/profile/preferences` | ✅ | preferences | Tablero 2D/3D, tema y acento (DELETE = restablecer) |
| PATCH | `/profile` | 🔒 | profileEdit | Identidad pública |
| PUT, DELETE | `/profile/avatar` | 🔒 | profileEdit | Identidad pública y Storage |
| POST, DELETE | `/dev/bots/queue` | 🔒 | — | Solo desarrollo |
| POST | `/dev/tournaments` | 🔒 | — | Solo desarrollo |

Una ruta nueva queda 🔒 hasta que alguien la marque con `{ allow: 'any' }` y la agregue a esta tabla.
