import { NotFoundError } from '@/core/shared/errors/AppError';
import { contentEtag, etagMatches } from '@/core/shared/http/etag';
import { LIMITS, type RateLimiter } from '@/core/shared/http/rateLimit';
import type {
  CreateTournamentInput, RegistrationDTO, TournamentDetail, TournamentListResponse, TournamentSummary,
} from '../infrastructure/dto/tournamentSchemas';
import { toListResponse, toSummary, toTournamentDetail } from './tournamentDto';
import type { TournamentRepository } from './ports/TournamentRepository';

type Clock = () => Date;
const systemClock: Clock = () => new Date();

export type Conditional<T> = { notModified: true; etag: string } | { notModified: false; etag: string; body: T };

/** GET /tournaments: aplica el paso del tiempo (empezar, W.O.) y devuelve la lista con ETag por contenido. */
export class ListTournaments {
  constructor(private readonly repo: TournamentRepository, private readonly now: Clock = systemClock) {}
  async execute(userId: string, ifNoneMatch: string | null): Promise<Conditional<TournamentListResponse>> {
    const { tournaments, next } = await this.repo.list(userId);
    const body = toListResponse(tournaments, next, this.now());
    const etag = contentEtag('tl', body);
    return etagMatches(ifNoneMatch, etag) ? { notModified: true, etag } : { notModified: false, etag, body };
  }
}

/** GET /tournaments/:id: la llave completa (con 'tbd'), tu situación y el ETag. 404 TOURNAMENT_NOT_FOUND. */
export class GetTournament {
  constructor(private readonly repo: TournamentRepository, private readonly now: Clock = systemClock) {}
  async execute(userId: string, id: string, ifNoneMatch: string | null): Promise<Conditional<TournamentDetail>> {
    const body = toTournamentDetail(await this.repo.detail(id), userId, this.now());
    const etag = contentEtag('td', body);
    return etagMatches(ifNoneMatch, etag) ? { notModified: true, etag } : { notModified: false, etag, body };
  }
}

/** POST /tournaments/:id/registration → 201 (nueva) o 200 (ya estabas). 403 · 404 · 409 · 429. */
export class JoinTournament {
  constructor(private readonly repo: TournamentRepository, private readonly limit: RateLimiter, private readonly now: Clock = systemClock) {}
  async execute(userId: string, id: string): Promise<{ created: boolean; tournament: TournamentSummary }> {
    await this.limit(`tour-join:${userId}`, LIMITS.tourJoin);
    const created = (await this.repo.join(id, userId)) === 'created';
    return { created, tournament: toSummary(toTournamentDetail(await this.repo.detail(id), userId, this.now())) };
  }
}

/** DELETE /tournaments/:id/registration → 204. Solo antes de empezar (409 TOURNAMENT_CLOSED). */
export class LeaveTournament {
  constructor(private readonly repo: TournamentRepository) {}
  async execute(userId: string, id: string): Promise<void> {
    await this.repo.leave(id, userId);
  }
}

/** GET /tournaments/:id/registration (la URL del Location del 201). 404 NOT_REGISTERED. */
export class GetRegistration {
  constructor(private readonly repo: TournamentRepository) {}
  async execute(userId: string, id: string): Promise<RegistrationDTO> {
    const t = await this.repo.detail(id);
    const me = t.players.find(p => p.id === userId);
    if (!me) throw new NotFoundError('NOT_REGISTERED', 'No estás inscrito en este torneo');
    return { tournamentId: t.id, joinedAt: me.joinedAt, seed: me.seed };
  }
}

/** Crear (POST /dev/tournaments y scripts/tournament.ts). */
export class CreateTournament {
  constructor(private readonly repo: TournamentRepository, private readonly now: Clock = systemClock) {}
  async execute(userId: string, input: CreateTournamentInput): Promise<TournamentSummary> {
    const id = await this.repo.create(input);
    return toSummary(toTournamentDetail(await this.repo.detail(id), userId, this.now()));
  }
}
