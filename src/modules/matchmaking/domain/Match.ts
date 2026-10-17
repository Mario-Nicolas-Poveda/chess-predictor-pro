import type { MatchSummary, TimeControl } from '../infrastructure/dto/matchmakingSchemas';

export interface MatchRecord {
  id: string; whiteId: string; blackId: string; timeControl: TimeControl;
  status: MatchSummary['status']; createdAt: Date;
}
export const isPlayer = (m: MatchRecord, userId: string) => m.whiteId === userId || m.blackId === userId;
