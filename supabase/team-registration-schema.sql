-- Team registration: review and test before running in Production.
ALTER TABLE public.pickup_registrations
 ADD COLUMN IF NOT EXISTS registration_type text NOT NULL DEFAULT 'solo',
 ADD COLUMN IF NOT EXISTS team_name text,
 ADD COLUMN IF NOT EXISTS spots_reserved integer NOT NULL DEFAULT 1;
ALTER TABLE public.pickup_registrations DROP CONSTRAINT IF EXISTS pickup_team_valid;
ALTER TABLE public.pickup_registrations ADD CONSTRAINT pickup_team_valid CHECK (
 (registration_type='solo' AND spots_reserved=1 AND team_name IS NULL)
 OR (registration_type='team' AND spots_reserved=5 AND length(trim(team_name)) BETWEEN 2 AND 80)
);
-- The registration RPC, reconciliation RPC, and Stripe confirmation RPC
-- must all be upgraded in the same rollout before enabling team signups.
