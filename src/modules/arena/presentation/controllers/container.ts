import 'server-only';
import { EngineMovePicker } from '@/modules/ai-engine/infrastructure/EngineMovePicker';
import { SupabasePlayerDirectory } from '@/modules/matchmaking/infrastructure/SupabasePlayerDirectory';
import { AnswerDraw } from '../../application/AnswerDraw';
import { BotTurn } from '../../application/BotTurn';
import { GetGameState } from '../../application/GetGameState';
import { GetMatchHistory } from '../../application/GetMatchHistory';
import { GetMove } from '../../application/GetMove';
import { GetProfileHistory } from '../../application/GetProfileHistory';
import { Rematch } from '../../application/Rematch';
import { MakeMove } from '../../application/MakeMove';
import { OfferDraw } from '../../application/OfferDraw';
import { Resign } from '../../application/Resign';
import { ChessJsRules } from '../../infrastructure/ChessJsRules';
import { SupabaseArenaRepository } from '../../infrastructure/SupabaseArenaRepository';

const repo = new SupabaseArenaRepository();
const players = new SupabasePlayerDirectory();
export const makeMove = new MakeMove(repo, players, new ChessJsRules());
// los bots juegan solos únicamente con ENABLE_DEV_ROUTES=true
const bots = process.env.ENABLE_DEV_ROUTES === 'true' ? new BotTurn(repo, makeMove, new EngineMovePicker(), players) : undefined;
export const getGameState = new GetGameState(repo, players, bots);
export const getMove = new GetMove(repo);
export const resign = new Resign(repo, players);
export const offerDraw = new OfferDraw(repo, players);
export const answerDraw = new AnswerDraw(repo, players);
export const getMatchHistory = new GetMatchHistory(repo, players);
export const getProfileHistory = new GetProfileHistory(repo, players);
export const rematch = new Rematch(repo);
