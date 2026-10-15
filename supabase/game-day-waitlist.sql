-- All In Sports game-day waitlist / payment workflow.
-- Run after supabase/pickup-registrations.sql (including the corrected RPC grant).
-- This migration DOES NOT start a scheduler or send notifications.
-- All timestamps are derived from game starts_at in America/New_York.
ALTER TABLE public.pickup_registrations
 DROP CONSTRAINT IF EXISTS pickup_registrations_status_check;
ALTER TABLE public.pickup_registrations
 ADD CONSTRAINT pickup_registrations_status_check
 CHECK (status IN ('pending_payment','confirmed','cancelled','waitlisted','offered','expired'));
ALTER TABLE public.pickup_registrations
 ADD COLUMN IF NOT EXISTS offer_expires_at timestamptz,
 ADD COLUMN IF NOT EXISTS payment_submitted_at timestamptz,
 ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz,
 ADD COLUMN IF NOT EXISTS payment_verified_by uuid references auth.users(id);
CREATE INDEX IF NOT EXISTS pickup_registrations_queue_idx
 ON public.pickup_registrations(game_id,status,created_at);

-- The cutoff is always 10:00 AM New York time on the local game date,
-- including when DST changes. Never derive it from a fixed UTC offset.
CREATE OR REPLACE FUNCTION public.pickup_payment_deadline(p_start timestamptz)
RETURNS timestamptz LANGUAGE sql STABLE AS $$
 SELECT (((p_start AT TIME ZONE 'America/New_York')::date + time '10:00')
 AT TIME ZONE 'America/New_York');
$$;
REVOKE ALL ON FUNCTION public.pickup_payment_deadline(timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pickup_payment_deadline(timestamptz) TO service_role;

-- Atomically accept a signup. Once full, new signups join FIFO waitlist.
-- A late direct signup joins the waitlist, even if spots appear empty,
-- because after 10 AM waitlisted players have priority.
CREATE OR REPLACE FUNCTION public.request_pickup_registration(
 p_game_id uuid,p_player_id text,p_user_id uuid
) RETURNS TABLE(registration_id uuid,registration_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.pickup_games%rowtype; r public.pickup_registrations%rowtype;
 active_count integer; queued_count integer; new_status text;
BEGIN
 SELECT * INTO g FROM public.pickup_games WHERE id=p_game_id FOR UPDATE;
 IF NOT FOUND OR g.status <> 'published' OR g.starts_at <= now()
 THEN RAISE EXCEPTION 'GAME_UNAVAILABLE'; END IF;
 SELECT * INTO r FROM public.pickup_registrations
  WHERE game_id=p_game_id AND user_id=p_user_id;
 IF FOUND THEN
  IF r.status IN ('cancelled','expired') THEN RAISE EXCEPTION 'REGISTRATION_CLOSED'; END IF;
  RETURN QUERY SELECT r.id,r.status; RETURN;
 END IF;
 SELECT count(*) INTO active_count FROM public.pickup_registrations
 WHERE game_id=p_game_id AND status IN ('pending_payment','confirmed','offered');
 SELECT count(*) INTO queued_count FROM public.pickup_registrations
 WHERE game_id=p_game_id AND status='waitlisted';
 IF now() >= public.pickup_payment_deadline(g.starts_at)
    OR active_count >= g.capacity OR queued_count > 0
 THEN new_status:='waitlisted';
 ELSE new_status:='pending_payment'; END IF;
 INSERT INTO public.pickup_registrations(game_id,player_id,user_id,status)
 VALUES(p_game_id,p_player_id,p_user_id,new_status)
 RETURNING * INTO r;
 RETURN QUERY SELECT r.id,r.status;
END;
$$;
REVOKE ALL ON FUNCTION public.request_pickup_registration(uuid,text,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_pickup_registration(uuid,text,uuid) TO service_role;

-- Player may flag that they submitted a Zelle payment; never self-confirm.
-- This only protects pending/offered reservations until an admin reviews them.
CREATE OR REPLACE FUNCTION public.submit_pickup_payment(
 p_registration_id uuid,p_user_id uuid
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.pickup_registrations%rowtype; g public.pickup_games%rowtype;
BEGIN
 SELECT * INTO r FROM public.pickup_registrations WHERE id=p_registration_id FOR UPDATE;
 IF NOT FOUND OR r.user_id<>p_user_id THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 SELECT * INTO g FROM public.pickup_games WHERE id=r.game_id;
 IF g.starts_at<=now() OR r.status NOT IN ('pending_payment','offered')
  OR (r.status='pending_payment' AND now()>public.pickup_payment_deadline(g.starts_at))
  OR (r.status='offered' AND (r.offer_expires_at IS NULL OR now()>r.offer_expires_at))
 THEN RAISE EXCEPTION 'PAYMENT_WINDOW_CLOSED'; END IF;
 UPDATE public.pickup_registrations SET
 payment_status='pending_verification',payment_submitted_at=now()
 WHERE id=r.id AND payment_status='unpaid';
 RETURN 'pending_verification';
END;
$$;
REVOKE ALL ON FUNCTION public.submit_pickup_payment(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_pickup_payment(uuid,uuid) TO service_role;

-- Single-game atomic reconciliation, to be called only by an authorized
-- server-side operator or future scheduler. Protected pending_verification
-- entries are NEVER expired. No notifications are sent by this function.
CREATE OR REPLACE FUNCTION public.reconcile_pickup_waitlist(p_game_id uuid)
RETURNS TABLE(expired_count integer,offered_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.pickup_games%rowtype; expired_n integer:=0; offered_n integer:=0;
 occupied integer; next_id uuid; now_at timestamptz:=now();
BEGIN
 SELECT * INTO g FROM public.pickup_games WHERE id=p_game_id FOR UPDATE;
 IF NOT FOUND OR g.status<>'published' THEN RAISE EXCEPTION 'GAME_UNAVAILABLE'; END IF;
 IF now_at<public.pickup_payment_deadline(g.starts_at)
    OR now_at>=g.starts_at THEN RETURN QUERY SELECT 0,0; RETURN; END IF;
 UPDATE public.pickup_registrations SET status='expired',offer_expires_at=NULL
 WHERE game_id=p_game_id AND payment_status='unpaid'
 AND ((status='pending_payment' AND now_at>=public.pickup_payment_deadline(g.starts_at))
 OR (status='offered' AND offer_expires_at<=now_at));
 GET DIAGNOSTICS expired_n=ROW_COUNT;
 SELECT count(*) INTO occupied FROM public.pickup_registrations
 WHERE game_id=p_game_id AND status IN ('pending_payment','confirmed','offered');
 WHILE occupied<g.capacity AND now_at<
   LEAST(g.starts_at,public.pickup_payment_deadline(g.starts_at)+interval '2 hours')
 LOOP
  SELECT id INTO next_id FROM public.pickup_registrations
   WHERE game_id=p_game_id AND status='waitlisted'
   ORDER BY created_at,id LIMIT 1;
  EXIT WHEN next_id IS NULL;
  UPDATE public.pickup_registrations SET status='offered',
   offer_expires_at=LEAST(now_at+interval '60 minutes',g.starts_at)
   WHERE id=next_id;
  occupied:=occupied+1;offered_n:=offered_n+1;next_id:=NULL;
 END LOOP;
 RETURN QUERY SELECT expired_n,offered_n;
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_pickup_waitlist(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_pickup_waitlist(uuid) TO service_role;
