-- Run before deploying test-game isolation code.
-- Test games remain in the shared database but are excluded from public listings.
ALTER TABLE public.pickup_games ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS pickup_games_public_test_filter_idx ON public.pickup_games(status,starts_at) WHERE is_test=false;
