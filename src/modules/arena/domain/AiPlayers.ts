import type { AiLevel } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';

// quién juega con el motor: los usuarios IA (users.ai_level) y, en desarrollo, los bots
export interface AiPlayers {
  /** Nivel del usuario si es una IA (o un bot de desarrollo con ENABLE_DEV_ROUTES); null si es una persona. */
  levelOf(userId: string): Promise<AiLevel | null>;
}
