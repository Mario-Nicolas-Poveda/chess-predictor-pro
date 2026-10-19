import type { z } from 'zod';
import '../zod'; // mensajes de zod en español

// params de ruta como objeto: el error sale en fields.<nombre>
export const parseParams = <S extends z.ZodType>(schema: S, params: unknown): z.infer<S> => schema.parse(params);

// query string (?a=1&b=2); no es estricta: los parámetros que sobran se ignoran. Request, igual que readJson
export const parseQuery = <S extends z.ZodType>(schema: S, req: Request): z.infer<S> =>
  schema.parse(Object.fromEntries(new URL(req.url).searchParams));
