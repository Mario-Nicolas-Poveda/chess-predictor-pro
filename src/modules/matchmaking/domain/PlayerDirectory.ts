import type { PlayerSummary } from '../infrastructure/dto/matchmakingSchemas';

// Datos públicos de los jugadores, sin depender del módulo dashboard
export interface PlayerDirectory { getMany(ids: string[]): Promise<PlayerSummary[]> }
