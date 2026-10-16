import type { TimeControl } from '../infrastructure/dto/matchmakingSchemas';

export interface QueueEntry { userId: string; elo: number; timeControl: TimeControl; joinedAt: Date; isBot: boolean }
