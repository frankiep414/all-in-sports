-- Historical SMS consent recovery, review before execution.
-- Run ONLY after checking Twilio STOP / opt-out suppression for all candidates.
-- Put any suppressed E.164 phone numbers into excluded_numbers below.
-- This script deliberately never changes email consent.
BEGIN;
CREATE TEMP TABLE excluded_numbers(phone_e164 text PRIMARY KEY) ON COMMIT DROP;
-- Example: INSERT INTO excluded_numbers VALUES ('+15555550123');

CREATE TEMP TABLE historical_sms_candidates ON COMMIT DROP AS
WITH normalized AS (
 SELECT u.id AS user_id, p.email, p.sms_consent_at,
 CASE WHEN regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^[0-9]{10}$'
      THEN '+1' || regexp_replace(p.phone, '[^0-9]', '', 'g')
      WHEN regexp_replace(p.phone, '[^0-9]', '', 'g') ~ '^1[0-9]{10}$'
      THEN '+' || regexp_replace(p.phone, '[^0-9]', '', 'g')
      ELSE NULL END AS phone_e164
 FROM public.players p JOIN auth.users u ON lower(u.email)=lower(p.email)
 WHERE p.sms_consent IS TRUE AND p.sms_consent_at IS NOT NULL
)
SELECT n.*
FROM normalized n
LEFT JOIN public.notification_preferences np ON np.user_id=n.user_id
LEFT JOIN public.player_announcement_preferences ap ON ap.user_id=n.user_id
WHERE n.phone_e164 IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM excluded_numbers x WHERE x.phone_e164=n.phone_e164)
 AND np.sms_opted_out_at IS NULL
 AND ap.sms_updated_at IS NULL
 AND (ap.sms_opt_in IS NULL OR ap.sms_opt_in IS FALSE)
 AND (np.sms_opted_in IS NULL OR np.sms_opted_in IS FALSE)
 AND NOT EXISTS (SELECT 1 FROM public.notification_preferences stop
                 WHERE stop.phone_e164=n.phone_e164 AND stop.sms_opted_out_at IS NOT NULL);

-- DRY RUN: inspect candidate count and masked recipients first.
SELECT count(*) AS eligible_to_restore FROM historical_sms_candidates;
SELECT left(email,3)||'***' AS masked_email, right(phone_e164,4) AS phone_last4,
       sms_consent_at FROM historical_sms_candidates ORDER BY sms_consent_at;

-- Do not enable automatically. After Twilio STOP verification, uncomment the two
-- INSERT statements, and change ROLLBACK to COMMIT.
-- INSERT INTO public.notification_preferences
--   (user_id,phone_e164,sms_opted_in,sms_game_alerts,sms_transactional,sms_consented_at,updated_at)
-- SELECT user_id,phone_e164,true,true,false,sms_consent_at,now()
-- FROM historical_sms_candidates
-- ON CONFLICT (user_id) DO UPDATE SET
--   phone_e164=EXCLUDED.phone_e164,sms_opted_in=true,sms_game_alerts=true,
--   sms_consented_at=EXCLUDED.sms_consented_at,updated_at=now()
-- WHERE notification_preferences.sms_opted_out_at IS NULL;
--
-- INSERT INTO public.player_announcement_preferences
--   (user_id,sms_opt_in,sms_updated_at,updated_at)
-- SELECT user_id,true,now(),now() FROM historical_sms_candidates
-- ON CONFLICT (user_id) DO UPDATE SET
--   sms_opt_in=true,sms_updated_at=now(),updated_at=now()
-- WHERE player_announcement_preferences.sms_updated_at IS NULL;

ROLLBACK;
