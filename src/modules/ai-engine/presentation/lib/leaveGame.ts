import { ApiError } from '@/lib/apiClient';
import { arenaApi } from '@/modules/arena/presentation/api/arenaApi';

/** Deja una partida sin terminar: en juego se rinde; si aún no tiene jugadas no hay a qué rendirse y se cancela. */
export const leaveGame = (id: string) => arenaApi.resign(id).then(() => {}, e => {
  if (e instanceof ApiError && e.code === 'MATCH_NOT_ACTIVE') return arenaApi.cancel(id);
  throw e;
});
