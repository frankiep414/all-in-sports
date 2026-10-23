/**
 * All In Rating 2.0 — Phase 1 event scoring.
 *
 * Provisional 2024 action weights, pending full legacy formula reconciliation.
 * Raw event counts are authoritative; these points are NOT a 0–10 rating.
 * No production integration or database access.
 */
export const LEGACY_ACTION_WEIGHTS = {
  goal: 1.5,
  assist: 0.85,
  goalkeeper_save: 1.0,
  successful_tackle: 0.5,
  interception: 0.25,
  completed_pass: 0.15,
  successful_dribble: 0.2,
  shot_on_goal: 0.6,
  lost_possession: -0.6,
  incomplete_pass: -0.6,
  own_goal: -1.25,
} as const;

export type ActionType = keyof typeof LEGACY_ACTION_WEIGHTS;
export type ReviewStatus = 'candidate' | 'verified' | 'rejected';
export type TeamCode = 'green' | 'white';

export type MatchAction = {
  id: string;
  sessionId: string;
  timestampSeconds: number;
  team: TeamCode;
  temporaryPlayerId: string | null;
  action: ActionType;
  reviewStatus: ReviewStatus;
  evidenceNote?: string;
};

export type PlayerSummary = {
  temporaryPlayerId: string;
  goals: number;
  assists: number;
  saves: number;
  actionPoints: number;
};

/** Excludes pending/rejected events and events without a verified player assignment. */
export function summarizeVerifiedPlayerActions(actions: readonly MatchAction[]): PlayerSummary[] {
  const summaries = new Map<string, PlayerSummary>();
  for (const event of actions) {
    if (event.reviewStatus !== 'verified' || !event.temporaryPlayerId) continue;
    const key = event.temporaryPlayerId;
    const row = summaries.get(key) ?? {
      temporaryPlayerId: key,
      goals: 0,
      assists: 0,
      saves: 0,
      actionPoints: 0,
    };
    if (event.action === 'goal') row.goals += 1;
    if (event.action === 'assist') row.assists += 1;
    if (event.action === 'goalkeeper_save') row.saves += 1;
    row.actionPoints += LEGACY_ACTION_WEIGHTS[event.action];
    summaries.set(key, row);
  }
  return [...summaries.values()].sort((a, b) =>
    a.temporaryPlayerId.localeCompare(b.temporaryPlayerId)
  );
}

/**
 * Unassigned or uncertain goals can still be tracked as candidates,
 * but they must not appear in verified individual totals.
 * An actual 0–10 rating requires separate rules for wins, minutes,
 * normalization, caps, and goalkeeper balance.
 */
