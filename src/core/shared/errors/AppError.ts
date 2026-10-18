export type ErrorFields = Record<string, string[]>;
export type ErrorMeta = Record<string, unknown>;

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly fields?: ErrorFields,
    public readonly meta?: ErrorMeta,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos inválidos', fields?: ErrorFields, code = 'VALIDATION_ERROR') { super(code, message, 400, fields); }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Sesión inválida o expirada') { super('UNAUTHORIZED', message, 401); }
}
export class ForbiddenError extends AppError {
  constructor(message = 'No tienes permiso para esto') { super('FORBIDDEN', message, 403); }
}
export class NotFoundError extends AppError {
  constructor(code = 'NOT_FOUND', message = 'No encontrado', meta?: ErrorMeta) { super(code, message, 404, undefined, meta); }
}
export class ConflictError extends AppError {
  constructor(code: string, message: string, fields?: ErrorFields, meta?: ErrorMeta) { super(code, message, 409, fields, meta); }
}
export class UnprocessableError extends AppError {
  constructor(code = 'UNPROCESSABLE', message = 'La solicitud es válida pero no se puede aplicar', meta?: ErrorMeta) { super(code, message, 422, undefined, meta); }
}
export class UnsupportedMediaTypeError extends AppError {
  constructor() { super('UNSUPPORTED_MEDIA_TYPE', 'El cuerpo debe ser JSON', 415); }
}
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Servicio no disponible') { super('SERVICE_UNAVAILABLE', message, 503); }
}
