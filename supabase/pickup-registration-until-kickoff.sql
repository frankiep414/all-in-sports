-- Apply in Supabase SQL Editor after supabase/game-day-waitlist.sql.
-- Keep new pickup registrations open until kickoff if capacity remains.
-- Preserve FIFO: when a waitlist exists, new arrivals queue behind it.
-- Pending payment spots remain reserved until kickoff or explicit withdrawal;
-- do not expire them at 10 AM. Admin reconciliation can offer available spots
-- to existing waitlisted players until kickoff (no automatic notification).

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
 IF active_count >= g.capacity OR queued_count > 0
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


CREATE OR REPLACE FUNCTION public.submit_pickup_payment(
 p_registration_id uuid,p_user_id uuid
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.pickup_registrations%rowtype; g public.pickup_games%rowtype;
BEGIN
 SELECT * INTO r FROM public.pickup_registrations WHERE id=p_registration_id FOR UPDATE;
 IF NOT FOUND OR r.user_id<>p_user_id THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 SELECT * INTO g FROM public.pickup_games WHERE id=r.game_id;
 IF g.starts_at<=now() OR r.status NOT IN ('pending_payment','offered')
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


CREATE OR REPLACE FUNCTION public.reconcile_pickup_waitlist(p_game_id uuid)
RETURNS TABLE(expired_count integer,offered_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE g public.pickup_games%rowtype; expired_n integer:=0; offered_n integer:=0;
 occupied integer; next_id uuid; now_at timestamptz:=now();
BEGIN
 SELECT * INTO g FROM public.pickup_games WHERE id=p_game_id FOR UPDATE;
 IF NOT FOUND OR g.status<>'published' THEN RAISE EXCEPTION 'GAME_UNAVAILABLE'; END IF;
 IF now_at>=g.starts_at THEN RETURN QUERY SELECT 0,0; RETURN; END IF;
 UPDATE public.pickup_registrations SET status='expired',offer_expires_at=NULL
 WHERE game_id=p_game_id AND payment_status='unpaid'
 AND status='offered' AND offer_expires_at<=now_at;
 GET DIAGNOSTICS expired_n=ROW_COUNT;
 SELECT count(*) INTO occupied FROM public.pickup_registrations
 WHERE game_id=p_game_id AND status IN ('pending_payment','confirmed','offered');
 WHILE occupied<g.capacity AND now_at<g.starts_at
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
