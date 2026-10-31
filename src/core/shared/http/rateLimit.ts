import 'server-only';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import { TooManyRequestsError } from '@/core/shared/errors/AppError';

export interface Limit { limit: number; windowS: number }
// los casos de uso lo reciben por constructor: en los tests va uno que no hace nada
export type RateLimiter = (key: string, l: Limit) => Promise<void>;

export const LIMITS = {
  loginIp:    { limit: 30, windowS: 60 },        // POST /auth/login por IP
  loginEmail: { limit: 20, windowS: 900 },       // POST /auth/login por correo: frena probar claves contra una cuenta
  register:   { limit: 60, windowS: 3600 },      // POST /auth/register por IP (holgado: un salón comparte IP)
  aiMove:     { limit: 30, windowS: 60 },        // POST /ai/move
  prediction: { limit: 60, windowS: 60 },        // GET /matches/:id/prediction
  aiGames:    { limit: 20, windowS: 3600 },      // POST /ai/games
  avatar:     { limit: 10, windowS: 3600 },      // PUT /profile/avatar
} as const satisfies Record<string, Limit>;

// ventana fija por clave en la BD (rate_hit): sirve aunque Vercel use varias instancias. 429 si pasó el límite
export const rateLimit: RateLimiter = async (key, l) => {
  const { data, error } = await supabaseAdmin.rpc('rate_hit', { p_key: key, p_limit: l.limit, p_window_s: l.windowS });
  if (error) throw error;
  if ((data as number) > 0) throw new TooManyRequestsError(data as number);
};
