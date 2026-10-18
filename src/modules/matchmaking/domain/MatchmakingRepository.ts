import type { TimeControl } from '../infrastructure/dto/matchmakingSchemas';
import type { MatchRecord } from './Match';
import type { QueueEntry } from './QueueEntry';

export interface MatchmakingRepository {
  findEntry(userId: string): Promise<QueueEntry | null>;
  enqueue(entry: Omit<QueueEntry, 'joinedAt'>): Promise<QueueEntry>;
  dequeue(userId: string): Promise<boolean>;                       // true si borró algo
  dequeueBots(): Promise<void>;
  tryPair(userId: string): Promise<string | null>;                 // id de la partida creada
  cleanup(): Promise<void>;
  countSearching(): Promise<Record<TimeControl, number>>;          // vistos hace < 15 s, o bots
  findOpenMatchFor(userId: string): Promise<MatchRecord | null>;   // active, o pending de < 3 min (0004)
  findMatch(id: string): Promise<MatchRecord | null>;
  abortIfPending(id: string): Promise<boolean>;                    // true si la pasó a aborted; false si ya no estaba pending
}
