import { NotFoundError } from '@/core/shared/errors/AppError';
import { toErrorResponse } from '@/core/shared/errors/toErrorResponse';

// las rutas concretas tienen prioridad: este comodín solo atiende lo que no existe
const notFound = () => toErrorResponse(new NotFoundError('ROUTE_NOT_FOUND', 'Esta ruta de la API no existe'));

export { notFound as GET, notFound as POST, notFound as PATCH, notFound as PUT, notFound as DELETE };
