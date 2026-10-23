import { AppError } from '@/core/shared/errors/AppError';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { other, type MatchRecord } from '../domain/Match';

const DRAW_ANSWER_MS = 1500;   // el bot contesta tablas 1,5 s después de la oferta
const DRAW_FROM_PLY = 20;      // las acepta desde la jugada 10; antes las rechaza

// Solo en desarrollo (ENABLE_DEV_ROUTES=true): el bot contesta tablas cuando el humano consulta.
// Sus jugadas las hace PlayAiTurn, igual que las de la IA
export class BotTurn {
  constructor(private repo: ArenaRepository) {}

  // true si el bot cambió la partida (hay que releerla)
  async run(m: MatchRecord): Promise<boolean> {
    if (m.status !== 'active') return false;
    const [botId] = await this.repo.botIds([m.whiteId, m.blackId]);
    if (!botId) return false;
    const bot = botId === m.whiteId ? 'white' : 'black';
    if (m.drawOfferBy !== other(bot) || !m.drawOfferedAt || Date.now() - m.drawOfferedAt.getTime() < DRAW_ANSWER_MS) return false;
    try {
      if (m.ply >= DRAW_FROM_PLY) await this.repo.acceptDraw(m.id, bot);
      else await this.repo.clearDrawOffer(m.id);
      return true;
    } catch (e) {
      // dos consultas a la vez: una gana y la otra recibe NO_DRAW_OFFER, que se ignora
      if (e instanceof AppError) return true;
      throw e;
    }
  }
}
