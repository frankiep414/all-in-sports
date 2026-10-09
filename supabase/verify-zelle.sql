-- Run after game-day-waitlist.sql.
-- Admin verification uses this locked RPC; no client can mark itself paid.
CREATE OR REPLACE FUNCTION public.verify_pickup_zelle(
 p_registration_id uuid,p_admin_user_id uuid
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.pickup_registrations%rowtype; g public.pickup_games%rowtype;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=p_admin_user_id)
 THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
 SELECT * INTO r FROM public.pickup_registrations WHERE id=p_registration_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 SELECT * INTO g FROM public.pickup_games WHERE id=r.game_id FOR UPDATE;
 SELECT * INTO r FROM public.pickup_registrations WHERE id=p_registration_id FOR UPDATE;
 IF r.status NOT IN ('pending_payment','offered','confirmed')
  OR r.payment_status NOT IN ('pending_verification','paid')
 THEN RAISE EXCEPTION 'NOT_ELIGIBLE'; END IF;
 IF r.payment_status='paid' AND r.status='confirmed' THEN RETURN 'confirmed'; END IF;
 UPDATE public.pickup_registrations SET status='confirmed',payment_status='paid',
  payment_verified_at=now(),payment_verified_by=p_admin_user_id,
  offer_expires_at=NULL WHERE id=p_registration_id;
 RETURN 'confirmed';
END;
$$;
REVOKE ALL ON FUNCTION public.verify_pickup_zelle(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pickup_zelle(uuid,uuid) TO service_role;
