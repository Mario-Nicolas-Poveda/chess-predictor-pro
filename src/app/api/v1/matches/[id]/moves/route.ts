import { withAuth } from '@/core/shared/auth/withAuth';
import { parseParams } from '@/core/shared/http/params';
import { readJson } from '@/core/shared/http/readJson';
import { created } from '@/core/shared/http/responses';
import { MakeMoveSchema } from '@/modules/arena/infrastructure/dto/arenaSchemas';
import { makeMove } from '@/modules/arena/presentation/controllers/container';
import { MatchParamsSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

export const POST = withAuth<{ id: string }>(async (req, s, params) => {
  const { id } = parseParams(MatchParamsSchema, params);
  const { ply, state } = await makeMove.execute(s.userId, id, await readJson(req, MakeMoveSchema));
  // state.moves trae solo la jugada nueva (since = ply - 1)
  return created({ move: state.moves.at(-1), state }, `/api/v1/matches/${id}/moves/${ply}`);
});
