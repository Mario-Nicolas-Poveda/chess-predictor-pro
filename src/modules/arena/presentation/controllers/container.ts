import 'server-only';
import { SupabasePlayerDirectory } from '@/modules/matchmaking/infrastructure/SupabasePlayerDirectory';
import { AnswerDraw } from '../../application/AnswerDraw';
import { GetGameState } from '../../application/GetGameState';
import { GetMove } from '../../application/GetMove';
import { MakeMove } from '../../application/MakeMove';
import { OfferDraw } from '../../application/OfferDraw';
import { Resign } from '../../application/Resign';
import { ChessJsRules } from '../../infrastructure/ChessJsRules';
import { SupabaseArenaRepository } from '../../infrastructure/SupabaseArenaRepository';

const repo = new SupabaseArenaRepository();
const players = new SupabasePlayerDirectory();
export const getGameState = new GetGameState(repo, players);
export const getMove = new GetMove(repo);
export const makeMove = new MakeMove(repo, players, new ChessJsRules());
export const resign = new Resign(repo, players);
export const offerDraw = new OfferDraw(repo, players);
export const answerDraw = new AnswerDraw(repo, players);
