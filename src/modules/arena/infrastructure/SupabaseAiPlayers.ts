import 'server-only';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import { recommendedLevel, type AiLevel } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import type { AiPlayers } from '../domain/AiPlayers';

type Bot = { level: AiLevel | null; elo: number };

export class SupabaseAiPlayers implements AiPlayers {
  private cache: Promise<Map<string, Bot>> | null = null;
  constructor(private readonly devBots: boolean) {}

  // los usuarios IA y los bots no cambian: se leen una vez por instancia
  private load() {
    return (this.cache ??= (async () => {
      const { data, error } = await supabaseAdmin.from('users').select('id, ai_level, elo_rating').eq('is_bot', true);
      if (error) { this.cache = null; throw error; }
      return new Map((data as { id: string; ai_level: AiLevel | null; elo_rating: number }[])
        .map(u => [u.id, { level: u.ai_level, elo: u.elo_rating }]));
    })());
  }

  async levelOf(userId: string) {
    const u = (await this.load()).get(userId);
    if (!u) return null;
    if (u.level) return u.level;
    return this.devBots ? recommendedLevel(u.elo) : null;   // bots de desarrollo
  }
}
