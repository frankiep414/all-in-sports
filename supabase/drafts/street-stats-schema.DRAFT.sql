-- DRAFT ONLY — DO NOT EXECUTE ON PRODUCTION
-- All In Sports / Street stats integration, additive development schema.
-- Validate on a separate Supabase test project first.
-- Street API payload and player identifier formats remain unverified.

BEGIN;

CREATE TABLE IF NOT EXISTS public.street_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_game_id uuid REFERENCES public.pickup_games(id) ON DELETE SET NULL,
  field_type text NOT NULL CHECK (field_type IN ('mens','coed','other')),
  session_date date NOT NULL,
  external_session_id text UNIQUE,
  import_status text NOT NULL DEFAULT 'pending'
    CHECK (import_status IN ('pending','processing','imported','review','published','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.street_player_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  street_session_id uuid NOT NULL REFERENCES public.street_sessions(id) ON DELETE CASCADE,
  external_player_id text NOT NULL,
  player_id bigint REFERENCES public.players(id) ON DELETE SET NULL,
  verification_status text NOT NULL DEFAULT 'unmatched'
    CHECK (verification_status IN ('unmatched','proposed','verified','rejected')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (street_session_id,external_player_id),
  CONSTRAINT street_verified_requires_player CHECK
    (verification_status <> 'verified' OR (player_id IS NOT NULL AND verified_by IS NOT NULL AND verified_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS street_verified_player_per_session_idx
  ON public.street_player_matches(street_session_id,player_id)
  WHERE verification_status='verified' AND player_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.street_stat_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  street_player_match_id uuid NOT NULL REFERENCES public.street_player_matches(id) ON DELETE CASCADE,
  source_record_key text NOT NULL,
  source_version text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  checksum text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (street_player_match_id,source_record_key)
);

CREATE TABLE IF NOT EXISTS public.street_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  street_session_id uuid NOT NULL REFERENCES public.street_sessions(id) ON DELETE CASCADE,
  street_player_match_id uuid REFERENCES public.street_player_matches(id) ON DELETE SET NULL,
  external_media_id text,
  media_type text NOT NULL CHECK (media_type IN ('match_highlight','reel','personal_highlight','other')),
  media_url text,
  rights_status text NOT NULL DEFAULT 'unreviewed'
    CHECK (rights_status IN ('unreviewed','approved','restricted')),
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','player','public')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS street_media_external_id_idx
  ON public.street_media(external_media_id) WHERE external_media_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS street_sessions_game_idx ON public.street_sessions(pickup_game_id);
CREATE INDEX IF NOT EXISTS street_player_matches_player_idx ON public.street_player_matches(player_id);
CREATE INDEX IF NOT EXISTS street_snapshots_match_idx ON public.street_stat_snapshots(street_player_match_id);

ALTER TABLE public.street_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.street_player_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.street_stat_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.street_media ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.street_sessions,public.street_player_matches,
  public.street_stat_snapshots,public.street_media FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.street_sessions,public.street_player_matches,
  public.street_stat_snapshots,public.street_media TO service_role;

-- No browser policies yet. Server routes must independently verify auth and admin privileges.
-- No provider credentials, API calls, production data migration, or publication included.
COMMIT;
