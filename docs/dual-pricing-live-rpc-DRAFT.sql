-- DRAFT ONLY. DO NOT APPLY until public price presentation and checkout flag are coordinated.
-- Existing base-price sessions remain valid; new grossed-up sessions are accepted.
-- Derived from production function on 2026-11-11. Review grants and run payment tests.
CREATE OR REPLACE FUNCTION public.confirm_pickup_stripe_live_payment(
 p_session_id text, p_payment_intent_id text, p_amount_cents integer, p_currency text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 s public.pickup_stripe_checkout_sessions%rowtype;
 r public.pickup_registrations%rowtype;
 g public.pickup_games%rowtype;
 base_cents bigint;
 regular_cents bigint;
BEGIN
 SELECT * INTO s FROM public.pickup_stripe_checkout_sessions
 WHERE stripe_checkout_session_id=p_session_id FOR UPDATE;
 IF NOT FOUND THEN RETURN 'unknown_session'; END IF;
 IF s.status='completed' THEN RETURN 'already_processed'; END IF;
 SELECT * INTO r FROM public.pickup_registrations WHERE id=s.registration_id FOR UPDATE;
 SELECT * INTO g FROM public.pickup_games WHERE id=r.game_id;
 base_cents := g.price_cents::bigint * r.spots_reserved::bigint;
 -- Same integer-cent formula as lib/dual-payment-pricing.ts:
 -- ceil((base + 30) / (1 - 0.029)).
 regular_cents := ((base_cents + 30) * 10000 + 9710 - 1) / 9710;
 IF g.is_test IS DISTINCT FROM false OR s.amount_cents<>p_amount_cents
 OR s.currency<>p_currency OR p_currency<>'usd'
 OR p_amount_cents::bigint NOT IN (base_cents,regular_cents) THEN
  UPDATE public.pickup_stripe_checkout_sessions
  SET status='refund_required',updated_at=now() WHERE id=s.id;
  RETURN 'manual_review';
 END IF;
 IF r.status NOT IN ('pending_payment','offered') OR r.payment_status<>'unpaid'
 OR (r.status='offered' AND (r.offer_expires_at IS NULL OR now()>r.offer_expires_at)) THEN
  UPDATE public.pickup_stripe_checkout_sessions
  SET status='refund_required',updated_at=now() WHERE id=s.id;
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
$function$;
