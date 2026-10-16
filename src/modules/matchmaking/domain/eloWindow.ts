// Misma regla que mm_window (0002_matchmaking.sql): ±100, +50 cada 10 s, máximo ±400
export const eloWindow = (waitedSeconds: number) => Math.min(400, 100 + 50 * Math.floor(waitedSeconds / 10));
