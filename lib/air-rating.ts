/**
 * AIR v1.0 — All In Rating.
 * STREET supplies raw counts only; STREET ratings are never an input.
 * Merge verified STREET aliases into a single player before calling this function.
 * Aggregate all verified sessions for a career rating; do not average weekly AIR.
 *
 * IMPORTANT: This calculator requires shots for field players. Existing
 * player_match_stats lacks a shots column; callers must migrate and backfill
 * before showing a final AIR. Null means unavailable, not zero.
 */
export const AIR_VERSION = '1.0' as const;

export type AIRPosition = 'field' | 'goalkeeper';
export type AIRStats = {
  appearances: number;
  goals: number;
  assists: number;
  saves: number;
  tackles: number;
  interceptions: number;
  completedPasses: number | null;
  attemptedPasses: number | null;
  shots: number | null;
};
export type AIRResult = {
  version: typeof AIR_VERSION;
  position: AIRPosition;
  rating: number | null;
  rawRating: number | null;
  appearances: number;
  provisional: boolean;
  missing: string[];
};
const cap = (value: number, benchmark: number) =>
  Math.min(1, Math.max(0, value / benchmark));
const round = (value: number) => Math.round(value * 100) / 100;

export function calculateAIR(stats: AIRStats, position: AIRPosition): AIRResult {
  const n = stats.appearances;
  const missing: string[] = [];
  if (!Number.isInteger(n) || n <= 0) missing.push('appearances');
  for (const key of ['goals','assists','saves','tackles','interceptions'] as const) {
    if (!Number.isFinite(stats[key]) || stats[key] < 0) missing.push(key);
  }
  if (stats.completedPasses === null || stats.attemptedPasses === null ||
      !Number.isFinite(stats.completedPasses) || !Number.isFinite(stats.attemptedPasses) ||
      stats.attemptedPasses <= 0 || stats.completedPasses < 0 ||
      stats.completedPasses > stats.attemptedPasses) missing.push('passing');
  if (position === 'field' && (stats.shots === null ||
      !Number.isFinite(stats.shots) || stats.shots < 0)) missing.push('shots');
  if (missing.length) return { version: AIR_VERSION, position, rating: null,
    rawRating: null, appearances: n, provisional: n < 3, missing };

  const goals = stats.goals / n;
  const assists = stats.assists / n;
  const saves = stats.saves / n;
  const tackles = stats.tackles / n;
  const interceptions = stats.interceptions / n;
  const passes = stats.completedPasses! / n;
  const accuracy = stats.completedPasses! / stats.attemptedPasses!;
  const passing = .6 * cap(accuracy, .75) + .4 * cap(passes, 12);
  const defense = .6 * cap(tackles, 1.5) + .4 * cap(interceptions, 1);

  let index: number;
  if (position === 'field') {
    const shots = stats.shots! / n;
    const attack = .65 * cap(goals, 1) + .25 * cap(assists, .6) + .10 * cap(shots, 2);
    const involvement = (cap(shots, 2) + cap(tackles + interceptions, 2) + cap(passes, 12)) / 3;
    index = .35 * attack + .25 * passing + .25 * defense + .15 * involvement;
  } else {
    const involvement = (cap(saves, 3) + cap(passes, 12)) / 2;
    index = .55 * cap(saves, 3) + .20 * passing + .15 * defense + .10 * involvement;
  }

  const rawRating = 2 + 8 * index;
  // Shrink small samples toward 5.0, not toward zero. More games improve
  // confidence but never increase the per-appearance statistical inputs.
  const rating = 5 + (rawRating - 5) * n / (n + 3);
  return { version: AIR_VERSION, position, rating: round(rating),
    rawRating: round(rawRating), appearances: n, provisional: n < 3, missing: [] };
}

export function combineAIRStats(rows: AIRStats[]): AIRStats {
  const sum = (key: keyof AIRStats) => rows.reduce((total, row) => total + (row[key] ?? 0), 0);
  const nullableSum = (key: 'completedPasses'|'attemptedPasses'|'shots') =>
    rows.some(row => row[key] === null) ? null : sum(key);
  return {
    appearances: sum('appearances'), goals: sum('goals'), assists: sum('assists'),
    saves: sum('saves'), tackles: sum('tackles'), interceptions: sum('interceptions'),
    completedPasses: nullableSum('completedPasses'),
    attemptedPasses: nullableSum('attemptedPasses'), shots: nullableSum('shots')
  };
}
