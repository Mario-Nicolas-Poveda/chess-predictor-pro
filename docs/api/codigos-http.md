# Códigos HTTP y errores · API v1

Cada respuesta usa el código que corresponde. Éxito sin cuerpo = **204**. Recurso inexistente = **404**.

| Código | Cuándo | `error.code` |
|---|---|---|
| **200 OK** | GET correcto, PATCH correcto | — |
| **201 Created** | POST que crea algo (registro, entrar a la cola). Lleva cabecera `Location` | — |
| **204 No Content** | DELETE correcto, logout. **Sin cuerpo** | — |
| **400 Bad Request** | Datos que no pasan Zod · JSON mal formado · id con formato inválido | `VALIDATION_ERROR`, `INVALID_JSON` |
| **401 Unauthorized** | Sin sesión o JWT vencido · correo o contraseña incorrectos | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| **403 Forbidden** | Con sesión, pero sin permiso sobre ese recurso | `FORBIDDEN` |
| **404 Not Found** | El recurso no existe · ruta de API inexistente | `NOT_FOUND`, `NOT_IN_QUEUE`, `MATCH_NOT_FOUND`, `ROUTE_NOT_FOUND` |
| **405 Method Not Allowed** | Método no soportado en una ruta que existe (lo responde Next solo, sin cuerpo JSON) | — |
| **409 Conflict** | Choca con el estado actual | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `ALREADY_IN_QUEUE`, `ACTIVE_MATCH_EXISTS`, `MATCH_NOT_PENDING`, `CONFLICT` |
| **415 Unsupported Media Type** | Body que no es `application/json` en POST/PATCH/PUT | `UNSUPPORTED_MEDIA_TYPE` |
| **500 Internal Server Error** | Error no previsto (se registra con `console.error`, no se expone el detalle) | `INTERNAL` |
| **503 Service Unavailable** | La base de datos no responde (`/health`) | `SERVICE_UNAVAILABLE` |

## Cuerpo de error (siempre igual)

```json
{ "error": { "code": "NOT_IN_QUEUE", "message": "No estás en la cola", "fields": {}, "meta": {} } }
```

`fields` (errores por campo) y `meta` (datos extra, por ejemplo `{ "matchId": "…" }`) son opcionales.
El front decide por `error.code`, nunca por el texto de `message`.

## En el código

| Para | Usa |
|---|---|
| Lanzar un error | `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `UnsupportedMediaTypeError`, `ServiceUnavailableError` (`src/core/shared/errors/AppError.ts`) |
| Leer el body | `await readJson(req, Schema)`: 415 si no es JSON, 400 `INVALID_JSON` si está roto, 400 `VALIDATION_ERROR` si no cumple el schema |
| Responder | `ok(data)`, `created(data, location)`, `noContent()` (`src/core/shared/http/responses.ts`) |
| Convertir un error en respuesta | `toErrorResponse(e)`; `withAuth` ya lo hace |
