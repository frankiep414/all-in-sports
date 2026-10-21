-- Team registration atomic migration. REVIEW IN PREVIEW BEFORE PRODUCTION.
-- Existing solo registrations default to one seat.
ALTER TABLE public.pickup_registrations
 ADD COLUMN IF NOT EXISTS registration_type text NOT NULL DEFAULT 'solo',
 ADD COLUMN IF NOT EXISTS team_name text,
 ADD COLUMN IF NOT EXISTS spots_reserved integer NOT NULL DEFAULT 1;
ALTER TABLE public.pickup_registrations DROP CONSTRAINT IF EXISTS pickup_team_valid;
ALTER TABLE public.pickup_registrations ADD CONSTRAINT pickup_team_valid CHECK (
 (registration_type='solo' AND spots_reserved=1 AND team_name IS NULL)
 OR (registration_type='team' AND spots_reserved=5 AND length(trim(team_name)) BETWEEN 2 AND 80)
);
CREATE OR REPLACE FUNCTION public.request_pickup_registration(
 p_game_id uuid,p_player_id text,p_user_id uuid,
 p_registration_type text,p_team_name text
) RETURNS TABLE(registration_id uuid,registration_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.pickup_games%rowtype; r public.pickup_registrations%rowtype;
 occupied integer; queued integer; seats integer; new_status text;
BEGIN
 IF p_registration_type IS NULL OR p_registration_type NOT IN ('solo','team') THEN RAISE EXCEPTION 'INVALID_REGISTRATION_TYPE'; END IF;
 seats:=CASE WHEN p_registration_type='team' THEN 5 ELSE 1 END;
 IF p_registration_type='team' AND (p_team_name IS NULL OR length(trim(p_team_name)) NOT BETWEEN 2 AND 80)
 THEN RAISE EXCEPTION 'INVALID_TEAM_NAME'; END IF;
 SELECT * INTO g FROM public.pickup_games WHERE id=p_game_id FOR UPDATE;
 IF NOT FOUND OR g.status<>'published' OR g.starts_at<=now() THEN RAISE EXCEPTION 'GAME_UNAVAILABLE'; END IF;
 SELECT * INTO r FROM public.pickup_registrations WHERE game_id=p_game_id AND user_id=p_user_id;
 IF FOUND THEN
  IF r.status IN ('cancelled','expired') THEN RAISE EXCEPTION 'REGISTRATION_CLOSED'; END IF;
  IF r.registration_type<>p_registration_type OR (p_registration_type='team' AND r.team_name<>trim(p_team_name))
  THEN RAISE EXCEPTION 'REGISTRATION_ALREADY_EXISTS'; END IF;
  RETURN QUERY SELECT r.id,r.status; RETURN;
 END IF;
 SELECT coalesce(sum(spots_reserved),0)::integer INTO occupied FROM public.pickup_registrations
 WHERE game_id=p_game_id AND status IN ('pending_payment','confirmed','offered');
 SELECT count(*) INTO queued FROM public.pickup_registrations WHERE game_id=p_game_id AND status='waitlisted';
 new_status:=CASE WHEN occupied+seats>g.capacity OR queued>0 THEN 'waitlisted' ELSE 'pending_payment' END;
 INSERT INTO public.pickup_registrations(game_id,player_id,user_id,status,registration_type,team_name,spots_reserved)
 VALUES(p_game_id,p_player_id,p_user_id,new_status,p_registration_type,
 CASE WHEN p_registration_type='team' THEN trim(p_team_name) ELSE NULL END,seats)
 RETURNING * INTO r;
 RETURN QUERY SELECT r.id,r.status;
END;
$$;
REVOKE ALL ON FUNCTION public.request_pickup_registration(uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_pickup_registration(uuid,text,uuid,text,text) TO service_role;
-- Retain compatibility with existing 3-argument callers.
CREATE OR REPLACE FUNCTION public.request_pickup_registration(p_game_id uuid,p_player_id text,p_user_id uuid)
RETURNS TABLE(registration_id uuid,registration_status text)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT * FROM public.request_pickup_registration(p_game_id,p_player_id,p_user_id,'solo',NULL);
$$;
REVOKE ALL ON FUNCTION public.request_pickup_registration(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_pickup_registration(uuid,text,uuid) TO service_role;

-- Waitlist FIFO: never skip the oldest waiting registration merely because a
-- later, smaller registration would fit. Capacity is counted in seats.
CREATE OR REPLACE FUNCTION public.reconcile_pickup_waitlist(p_game_id uuid)
RETURNS TABLE(expired_count integer,offered_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.pickup_games%rowtype; expired_n integer:=0; offered_n integer:=0;
 occupied integer; next_row public.pickup_registrations%rowtype; now_at timestamptz:=now();
BEGIN
 SELECT * INTO g FROM public.pickup_games WHERE id=p_game_id FOR UPDATE;
 IF NOT FOUND OR g.status<>'published' THEN RAISE EXCEPTION 'GAME_UNAVAILABLE'; END IF;
 IF now_at>=g.starts_at THEN RETURN QUERY SELECT 0,0; RETURN; END IF;
 UPDATE public.pickup_registrations SET status='expired',offer_expires_at=NULL
 WHERE game_id=p_game_id AND payment_status='unpaid'
 AND status='offered' AND offer_expires_at<=now_at;
 GET DIAGNOSTICS expired_n=ROW_COUNT;
 SELECT coalesce(sum(spots_reserved),0)::integer INTO occupied FROM public.pickup_registrations
 WHERE game_id=p_game_id AND status IN ('pending_payment','confirmed','offered');
 WHILE occupied<g.capacity AND now_at<g.starts_at LOOP
  SELECT * INTO next_row FROM public.pickup_registrations
  WHERE game_id=p_game_id AND status='waitlisted' ORDER BY created_at,id LIMIT 1;
  EXIT WHEN NOT FOUND;
  EXIT WHEN occupied+next_row.spots_reserved>g.capacity;
  UPDATE public.pickup_registrations SET status='offered',
   offer_expires_at=LEAST(now_at+interval '60 minutes',g.starts_at) WHERE id=next_row.id;
  occupied:=occupied+next_row.spots_reserved;
  offered_n:=offered_n+1;
 END LOOP;
 RETURN QUERY SELECT expired_n,offered_n;
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_pickup_waitlist(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_pickup_waitlist(uuid) TO service_role;

-- Stripe confirmation must validate seat-weighted price, for test and live.
DO $migration$
DECLARE mode_test boolean; fname text;
BEGIN
 FOR mode_test IN SELECT unnest(ARRAY[true,false]) LOOP
  fname:=CASE WHEN mode_test THEN 'confirm_pickup_stripe_test_payment' ELSE 'confirm_pickup_stripe_live_payment' END;
  EXECUTE format($fn$
CREATE OR REPLACE FUNCTION public.%I(
 p_session_id text,p_payment_intent_id text,p_amount_cents integer,p_currency text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $body$
DECLARE s public.pickup_stripe_checkout_sessions%%rowtype;
 r public.pickup_registrations%%rowtype; g public.pickup_games%%rowtype;
BEGIN
 SELECT * INTO s FROM public.pickup_stripe_checkout_sessions
 WHERE stripe_checkout_session_id=p_session_id FOR UPDATE;
 IF NOT FOUND THEN RETURN 'unknown_session'; END IF;
 IF s.status='completed' THEN RETURN 'already_processed'; END IF;
 SELECT * INTO r FROM public.pickup_registrations WHERE id=s.registration_id FOR UPDATE;
 SELECT * INTO g FROM public.pickup_games WHERE id=r.game_id FOR UPDATE;
 IF g.is_test IS DISTINCT FROM %L OR s.amount_cents<>p_amount_cents
 OR s.currency<>p_currency OR g.price_cents*r.spots_reserved<>p_amount_cents THEN
  UPDATE public.pickup_stripe_checkout_sessions SET status='refund_required',updated_at=now() WHERE id=s.id;
  RETURN 'manual_review';
 END IF;
 IF r.status NOT IN ('pending_payment','offered') OR r.payment_status<>'unpaid'
 OR (r.status='offered' AND (r.offer_expires_at IS NULL OR now()>r.offer_expires_at)) THEN
  UPDATE public.pickup_stripe_checkout_sessions SET status='refund_required',updated_at=now() WHERE id=s.id;
  RETURN 'manual_review';
 END IF;
 UPDATE public.pickup_registrations SET status='confirmed',payment_status='paid',
 payment_verified_at=now(),payment_verified_by=NULL WHERE id=r.id;
 UPDATE public.pickup_stripe_checkout_sessions SET status='completed',
 stripe_payment_intent_id=p_payment_intent_id,updated_at=now() WHERE id=s.id;
 INSERT INTO public.notification_events(event_key,event_type,game_id,registration_id,payload)
 VALUES ('payment_verified:'||r.id::text,'payment_verified',r.game_id,r.id,
 jsonb_build_object('source','stripe','checkout_session_id',p_session_id))
 ON CONFLICT(event_key) DO NOTHING;
 RETURN 'confirmed';
END;
$body$;
$fn$,fname,mode_test);
  EXECUTE format('REVOKE ALL ON FUNCTION public.%I(text,text,integer,text) FROM PUBLIC,anon,authenticated',fname);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(text,text,integer,text) TO service_role',fname);
 END LOOP;
END;
$migration$;
