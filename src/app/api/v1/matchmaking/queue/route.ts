import { withAuth } from '@/core/shared/auth/withAuth';
import { readJson } from '@/core/shared/http/readJson';
import { created, noContent } from '@/core/shared/http/responses';
import { JoinQueueSchema } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';
import { joinQueue, leaveQueue } from '@/modules/matchmaking/presentation/controllers/container';

export const POST = withAuth(async (req, s) => {
  const { timeControl } = await readJson(req, JoinQueueSchema);
  return created(await joinQueue.execute(s.userId, timeControl), '/api/v1/matchmaking/status');
});

export const DELETE = withAuth(async (_req, s) => {
  await leaveQueue.execute(s.userId);   // 404 NOT_IN_QUEUE si no estaba
  return noContent();
});
