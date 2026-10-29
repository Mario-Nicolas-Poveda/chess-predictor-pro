import type { Prediction } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import type { ArenaRepository } from '../domain/ArenaRepository';
import type { GameRules } from '../domain/GameRules';
import { turnOf } from '../domain/Match';
import type { MovePicker } from '../domain/MovePicker';
import { notAiMatch } from '../domain/errors';
import { settleOwn } from './GetGameState';

const PREDICT_MS = 300;

export class GetPrediction {
  constructor(private repo: ArenaRepository, private rules: GameRules, private engine: MovePicker,
              private limit: (key: string) => Promise<void>) {}

  async execute(userId: string, id: string, ifNoneMatch: string | null) {
    const { m, color } = await settleOwn(this.repo, userId, id);
    if (m.rated) throw notAiMatch();
    const live = m.status === 'pending' || m.status === 'active';
    // con takebacks: tras deshacer, el mismo ply puede ser otra posición
    const etag = `"p-${m.ply}-${m.takebacks}${live ? '' : '-f'}"`;
    if (ifNoneMatch === etag) return { etag, notModified: true as const };   // 304 sin pensar ni gastar el límite
    await this.limit(`prediction:${userId}`);
    const p = this.engine.predict(m.fen, PREDICT_MS);
    // tus mejores jugadas solo en tu turno: en el de la IA serían las suyas
    const top = live && turnOf(m.ply) === color ? p.top.map(x => ({ ...x, san: this.rules.sanAt(m.fen, x.uci) })) : [];
    const prediction: Prediction = { ply: m.ply, white: p.white, top, depth: p.depth };
    return { etag, notModified: false as const, prediction };
  }
}
