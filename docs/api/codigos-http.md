# Códigos HTTP y errores · API v1

Cada respuesta usa el código que corresponde. Éxito sin cuerpo = **204**. Recurso inexistente = **404**.

| Código | Cuándo | `error.code` |
|---|---|---|
| **200 OK** | GET correcto, PATCH correcto, POST que cambia el estado sin crear nada (rendirse, aceptar tablas), PUT que reemplaza (foto de perfil) | — |
| **201 Created** | POST que crea algo (registro, entrar a la cola, jugada, oferta de tablas, partida contra la IA) o PUT que crea el recurso (primera foto de perfil). Lleva cabecera `Location` | — |
| **202 Accepted** | Pedido registrado que todavía no crea nada: revancha ofrecida, falta que el rival acepte | — |
| **204 No Content** | DELETE correcto (también deshacer contra la IA: `DELETE /matches/:id/moves/last?ply=n`), logout. **Sin cuerpo** | — |
| **304 Not Modified** | `GET /matches/:id/state` o `GET /matches/:id/prediction` con `If-None-Match` igual al `ETag`: no cambió. **Sin cuerpo** | — |
| **400 Bad Request** | Datos que no pasan Zod · JSON mal formado · id con formato inválido | `VALIDATION_ERROR`, `INVALID_JSON` |
| **401 Unauthorized** | Sin sesión o JWT vencido · correo o contraseña incorrectos | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| **403 Forbidden** | Con sesión, pero sin permiso sobre ese recurso · predicción o deshacer en una partida con ELO · pedir jugadas de tu partida con ELO en juego (antitrampa) | `FORBIDDEN`, `NOT_AI_MATCH`, `LIVE_GAME_ANALYSIS` |
| **404 Not Found** | El recurso no existe · ruta de API inexistente | `NOT_FOUND`, `NOT_IN_QUEUE`, `MATCH_NOT_FOUND`, `MOVE_NOT_FOUND`, `NO_DRAW_OFFER`, `NO_REMATCH_OFFER`, `USER_NOT_FOUND`, `NO_AVATAR`, `AI_LEVEL_NOT_FOUND`, `ROUTE_NOT_FOUND` |
| **405 Method Not Allowed** | Método no soportado en una ruta que existe (lo responde Next solo, sin cuerpo JSON) | — |
| **409 Conflict** | Choca con el estado actual | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `ALREADY_IN_QUEUE`, `ACTIVE_MATCH_EXISTS`, `MATCH_NOT_PENDING`, `NOT_YOUR_TURN`, `STALE_PLY` (`meta.currentPly`), `MATCH_FINISHED`, `MATCH_ABORTED`, `MATCH_NOT_ACTIVE`, `DRAW_ALREADY_OFFERED`, `OWN_DRAW_OFFER`, `MATCH_NOT_FINISHED`, `REMATCH_ALREADY_OFFERED`, `AI_GAME_IN_PROGRESS` (`meta.matchId`), `AI_THINKING`, `NOTHING_TO_UNDO`, `NOT_RATED_MATCH`, `CONFLICT` |
| **413 Content Too Large** | Archivo de más de lo permitido (foto de perfil: 1 MB). Se rechaza por `Content-Length` sin leer el cuerpo | `FILE_TOO_LARGE` |
| **415 Unsupported Media Type** | Body que no es `application/json` en POST/PATCH/PUT · foto que no va en `multipart/form-data` · archivo que no es JPEG, PNG o WebP **por sus bytes** (SVG nunca) | `UNSUPPORTED_MEDIA_TYPE` |
| **422 Unprocessable Content** | JSON válido que no se puede aplicar: jugada ilegal en esa posición, o coronación sin la pieza (`e7e8` en vez de `e7e8q`) · posición sin jugadas en `POST /ai/move` | `ILLEGAL_MOVE`, `PROMOTION_REQUIRED`, `GAME_OVER` |
| **429 Too Many Requests** | Pasó el límite de uso (ventana fija por usuario en la BD): partidas contra la IA, jugadas sugeridas, predicción, foto. Lleva cabecera `Retry-After` en segundos y `meta.retryAfterS` | `RATE_LIMITED` |
| **500 Internal Server Error** | Error no previsto (se registra con `console.error`, no se expone el detalle) | `INTERNAL` |
| **503 Service Unavailable** | La base de datos no responde (`/health`) | `SERVICE_UNAVAILABLE` |

## Cuerpo de error (siempre igual)

```json
{ "error": { "code": "NOT_IN_QUEUE", "message": "No estás en la cola", "fields": {}, "meta": {} } }
```

`fields` (errores por campo) y `meta` (datos extra, por ejemplo `{ "matchId": "…" }`) son opcionales.
El front decide por `error.code`, nunca por el texto de `message`.

Todo 400 `VALIDATION_ERROR` trae `fields` no vacío: `{ "campo": ["mensaje"] }`.
- Campo anidado: la ruta va con puntos (`user.name`).
- Campo que sobra en un esquema estricto: `"Campo no permitido"`.
- Parámetro de ruta: su nombre (`/matches/abc` → `fields.id`).
- `_` = el cuerpo entero (por ejemplo, no es un objeto).

Los mensajes de Zod salen en español (`src/core/shared/zod.ts`).

## En el código

| Para | Usa |
|---|---|
| Lanzar un error | `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `UnprocessableError` (422), `UnsupportedMediaTypeError`, `PayloadTooLargeError` (413), `TooManyRequestsError` (429), `ServiceUnavailableError` (`src/core/shared/errors/AppError.ts`) |
| Leer el body | `await readJson(req, Schema)`: 415 si no es JSON, 400 `INVALID_JSON` si está roto, 400 `VALIDATION_ERROR` si no cumple el schema |
| Validar params de ruta | `parseParams(Schema, params)` con un `z.object` (`src/core/shared/http/params.ts`): el error sale en `fields.<param>` |
| Validar la query string | `parseQuery(Schema, req)`: los parámetros que sobran se ignoran |
| Responder | `ok(data)`, `created(data, location)`, `noContent()` (`src/core/shared/http/responses.ts`) |
| Trabajar después de responder | `afterResponse(label, fn)` (`src/core/shared/http/background.ts`): `after()` de Next; los errores solo se registran |
| Limitar el uso | `rateLimit(key, LIMITS.x)` (`src/core/shared/http/rateLimit.ts`), inyectado en el caso de uso desde `container.ts` |
| Tipo real de un archivo | `sniffImage(bytes)` (`src/core/shared/http/sniffImage.ts`) |
| Convertir un error en respuesta | `toErrorResponse(e)`; `withAuth` ya lo hace |
