import { AppError } from '@/core/shared/errors/AppError';
import { recommendedLevel } from '@/modules/ai-engine/infrastructure/dto/aiSchemas';
import type { PlayerDirectory } from '@/modules/matchmaking/domain/PlayerDirectory';
import type { ArenaRepository } from '../domain/ArenaRepository';
import { other, turnOf, type MatchRecord } from '../domain/Match';
import type { MovePicker } from '../domain/MovePicker';
import type { MakeMove } from './MakeMove';

const THINK_MS = 700;          // el bot juega 0,7 s después de que empieza su turno
const DRAW_ANSWER_MS = 1500;   // y contesta tablas 1,5 s después de la oferta
const DRAW_FROM_PLY = 20;      // las acepta desde la jugada 10; antes las rechaza

// Solo en desarrollo (ENABLE_DEV_ROUTES=true). Sin procesos en segundo plano: el bot piensa cuando el humano consulta
export class BotTurn {
  constructor(private repo: ArenaRepository, private makeMove: MakeMove, private picker: MovePicker, private players: PlayerDirectory) {}

  // true si el bot cambió la partida (hay que releerla)
  async run(m: MatchRecord): Promise<boolean> {
    if (m.status !== 'pending' && m.status !== 'active') return false;
    const [botId] = await this.repo.botIds([m.whiteId, m.blackId]);
    if (!botId) return false;
    const bot = botId === m.whiteId ? 'white' : 'black';
    const now = Date.now();
    try {
      if (m.drawOfferBy === other(bot) && m.drawOfferedAt && now - m.drawOfferedAt.getTime() >= DRAW_ANSWER_MS) {
        if (m.ply >= DRAW_FROM_PLY) await this.repo.acceptDraw(m.id, bot);
        else await this.repo.clearDrawOffer(m.id);
        return true;
      }
      // en pending el turno corre desde que se creó la partida (el bot con blancas abre)
      if (turnOf(m.ply) !== bot || now - (m.turnStartedAt ?? m.createdAt).getTime() < THINK_MS) return false;
      // juega con el motor al nivel de ELO más cercano al del bot
      const [me] = await this.players.getMany([botId]);
      const uci = this.picker.pick({ fen: m.fen }, recommendedLevel(me?.elo ?? 1200));
      await this.makeMove.execute(botId, m.id, { uci, ply: m.ply });
      return true;
    } catch (e) {
      // dos consultas a la vez: una gana y la otra recibe STALE_PLY (o NO_DRAW_OFFER), que se ignora
      if (e instanceof AppError) return true;
      throw e;
    }
  }
}
