import type { AiLevel } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import type { StoredMove } from '../../domain/playedMoves';

/** Lo que el coach necesita de una partida de la arena. */
export interface CoachGame {
  id: string;
  whiteId: string;
  blackId: string;
  status: 'pending' | 'active' | 'finished' | 'aborted';
  result: 'white' | 'black' | 'draw' | null;
  endReason: string | null;
  endedAt: Date | null;
  ply: number;
  timeControl: string;                 // '3+2' | '5+0' | '10+0' | 'none'
  whiteEloBefore: number | null;
  blackEloBefore: number | null;
  whiteAi: AiLevel | null;             // nivel si ese lado es la IA
  blackAi: AiLevel | null;
}

export interface CoachGames {
  find(matchId: string): Promise<CoachGame | null>;
  moves(matchId: string): Promise<StoredMove[]>;
  eloOf(userId: string): Promise<number>;
}
