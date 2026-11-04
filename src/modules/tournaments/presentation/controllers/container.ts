import 'server-only';
import { rateLimit } from '@/core/shared/http/rateLimit';
import {
  CreateTournament, GetRegistration, GetTournament, JoinTournament, LeaveTournament, ListTournaments,
} from '../../application/TournamentUseCases';
import { SupabaseTournamentRepository } from '../../infrastructure/SupabaseTournamentRepository';

const tourRepo = new SupabaseTournamentRepository();
export const listTournaments  = new ListTournaments(tourRepo);
export const getTournament    = new GetTournament(tourRepo);
export const joinTournament   = new JoinTournament(tourRepo, rateLimit);
export const leaveTournament  = new LeaveTournament(tourRepo);
export const getRegistration  = new GetRegistration(tourRepo);
export const createTournament = new CreateTournament(tourRepo);
