-- All In Sports notification foundation. No email or SMS is sent by this migration.
-- Run in Supabase SQL Editor. Service-role access only.
CREATE TABLE IF NOT EXISTS public.notification_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_key text NOT NULL UNIQUE,
 event_type text NOT NULL CHECK (event_type IN (
  'game_published','registration_received','payment_reported','payment_verified',
  'waitlist_joined','waitlist_offer','game_reminder','game_cancelled','game_updated','admin_reminder')),
 game_id uuid REFERENCES public.pickup_games(id) ON DELETE SET NULL,
 registration_id uuid REFERENCES public.pickup_registrations(id) ON DELETE SET NULL,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.notification_events(id) ON DELETE CASCADE,
 recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 channel text NOT NULL CHECK (channel IN ('email','sms')),
 destination text NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','delivered','failed','skipped')),
 provider text,
 provider_message_id text,
 error_code text,
 attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(event_id,channel,destination)
);
CREATE INDEX IF NOT EXISTS notification_deliveries_status_idx ON public.notification_deliveries(status,created_at);
CREATE TABLE IF NOT EXISTS public.notification_preferences (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 email_game_alerts boolean NOT NULL DEFAULT true,
 email_transactional boolean NOT NULL DEFAULT true,
 sms_opted_in boolean NOT NULL DEFAULT false,
 sms_game_alerts boolean NOT NULL DEFAULT false,
 sms_transactional boolean NOT NULL DEFAULT false,
 phone_e164 text,
 sms_consented_at timestamptz,
 sms_opted_out_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT sms_phone_format CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\\+[1-9][0-9]{7,14}$')
);
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_events,public.notification_deliveries,public.notification_preferences FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.notification_events,public.notification_deliveries,public.notification_preferences TO service_role;
-- Delivery workers and consent capture must be implemented before any messages can be sent.
