// Contrato compartido con el front: solo zod, sin imports de servidor
import { z } from 'zod';

export const TIME_CONTROLS = ['3+2', '5+0', '10+0'] as const;
export const TimeControlSchema = z.enum(TIME_CONTROLS);
export type TimeControl = z.infer<typeof TimeControlSchema>;

export const TIME_CONTROL_LABEL: Record<TimeControl, { label: string; kind: 'Blitz' | 'Rápida' }> = {
  '3+2':  { label: '3 + 2',  kind: 'Blitz' },
  '5+0':  { label: '5 + 0',  kind: 'Blitz' },
  '10+0': { label: '10 + 0', kind: 'Rápida' },
};

export const JoinQueueSchema = z.object({ timeControl: TimeControlSchema }).strict();
export type JoinQueueInput = z.infer<typeof JoinQueueSchema>;

export const MatchIdSchema = z.uuid('Id de partida inválido');

export type PlayerSummary = { id: string; username: string; displayName: string | null; avatarUrl: string | null; elo: number };

export type MatchSummary = {
  id: string;
  timeControl: TimeControl;
  status: 'pending' | 'active' | 'finished' | 'aborted';
  createdAt: string;
  yourColor: 'white' | 'black';
  you: PlayerSummary;
  opponent: PlayerSummary;
};

export type MatchmakingStatus =
  | { state: 'idle' }
  | { state: 'searching'; timeControl: TimeControl; joinedAt: string; waitedSeconds: number;
      elo: number; eloRange: { min: number; max: number }; searchingNow: number; pollAfterMs: number }
  | { state: 'matched'; match: MatchSummary };

export type QueueStats = { searching: Record<TimeControl, number>; total: number };
