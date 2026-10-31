import 'server-only';
import { LIMITS, rateLimit } from '@/core/shared/http/rateLimit';
import { ChessJsRules } from '@/modules/arena/infrastructure/ChessJsRules';
import { DeleteReview } from '../../application/DeleteReview';
import { GenerateReview } from '../../application/GenerateReview';
import { GenerateSummary } from '../../application/GenerateSummary';
import { GetReview } from '../../application/GetReview';
import { GetSummary } from '../../application/GetSummary';
import { RequestReview } from '../../application/RequestReview';
import { RequestSummary } from '../../application/RequestSummary';
import { ReviewBadges } from '../../application/ReviewBadges';
import { describeCoachWriter, makeCoachWriter } from '../../infrastructure/coachWriterFactory';
import { PROMPT_VERSION } from '../../infrastructure/OpenAiCompatibleCoachWriter';
import { SupabaseCoachGames } from '../../infrastructure/SupabaseCoachGames';
import { SupabaseCoachRepository } from '../../infrastructure/SupabaseCoachRepository';

const repo = new SupabaseCoachRepository();
const games = new SupabaseCoachGames();
const writer = makeCoachWriter();
const rules = new ChessJsRules();
console.info('[coach]', describeCoachWriter());                                   // qué modelo, sin la clave

export const requestReview = new RequestReview(repo, games, key => rateLimit(key, LIMITS.coachReview));
export const getReview = new GetReview(repo, games);
export const deleteReview = new DeleteReview(repo, games);
export const generateReview = new GenerateReview(repo, games, writer, (fen, uci) => rules.sanAt(fen, uci), PROMPT_VERSION);
export const requestSummary = new RequestSummary(repo, key => rateLimit(key, LIMITS.coachSummary));
export const getSummary = new GetSummary(repo);
export const generateSummary = new GenerateSummary(repo, games, writer);
export const reviewBadges = new ReviewBadges(repo);
