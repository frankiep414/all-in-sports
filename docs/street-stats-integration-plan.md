# Street Stats Integration — Phase 1 Design (NOT FOR PRODUCTION)

Status: draft; no SQL applied and no Street credentials configured.

## Verified from repository
- `players.id` is a numeric player identifier as used by `/api/player` and `/my-all-in`.
- `pickup_registrations.player_id` is text and stores `String(players.id)`; it also contains `game_id` and `user_id`.
- `pickup_games.id` is UUID. A field-specific Street session must not be assumed identical to a pickup game.
- `/my-all-in` has static placeholders for goals, assists, games and AI rating.
- Admin roster uses `admin_users` authorization.

## Database verification still needed
Repository SQL does not prove deployed database state. Obtain **read-only** schema metadata for public.players, pickup_games, pickup_registrations and relevant policies/constraints. Confirm player IDs, current migrations, game/team representation, and which players attended October 21. Do not run DDL on production.

## Proposed additive tables (names provisional)
1. `street_sessions`: UUID PK, optional pickup_game_id, field type (mens/coed), date, Street external match ID, processing status, unique external ID where provided.
2. `street_player_matches`: UUID PK, street_session_id, Street player reference, optional verified local player ID, verification state, verified_by/at, and evidence metadata. Unmatched players must never be automatically assigned by name alone.
3. `street_stat_snapshots`: session/player reference, provider schema version, raw JSON, normalized stats JSON, import timestamp and checksum; unique source identity to make retries idempotent.
4. `street_media`: session/player reference, highlight URL or provider media ID, media type, visibility and rights review status.

Prefer normalized numeric columns for confirmed metrics only after reviewing real API payload. Keep imported stats private until verified and approved. Never expose API secrets or private media URLs.

## Integration workflow
- Street processes footage and returns session/player data.
- Import using a server-only credential into an isolated development database.
- Admin matches provider player images to registered Player IDs and confirms.
- Publish verified records to authenticated player cards; release leaderboards only after validation.
- Build season aggregates without double-counting repeated imports.
- Provide corrections, unmatch and republish workflows.

## Testing / release gates
- Create isolated Supabase test project and Vercel preview environment (preview must not point to production DB).
- Use synthetic players and Street fixtures; no real data in test until authorized.
- Verify authentication, admin authorization, row-level security, duplicate imports, unknown players, incorrect matches, API failure and media permissions.
- No changes to `main`, production environment variables, live Supabase, or live website without separate approval.

## Open Street questions
- Sample real payload and provider player identifier stability
- Whether October 21 men's/coed sessions have distinct external IDs
- Whether provider rating, match-level stats, image and personal reels are API-accessible
- Player images and video hosting, consent, retention and embedding rights
- API authentication, rate limits and processing status retrieval
