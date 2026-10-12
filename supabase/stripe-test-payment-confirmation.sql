-- Preview Stripe test payments only. Run after stripe-checkout-foundation.sql.
-- This function atomically confirms a payment against its recorded checkout session.
-- Server must first validate the Stripe webhook signature and test mode.
create or replace function public.confirm_pickup_stripe_test_payment(
 p_session_id text,p_payment_intent_id text,p_amount_cents integer,p_currency text
) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.pickup_stripe_checkout_sessions%rowtype;
 r public.pickup_registrations%rowtype;
 g public.pickup_games%rowtype;
begin
 select * into s from public.pickup_stripe_checkout_sessions
 where stripe_checkout_session_id=p_session_id for update;
 if not found then return 'unknown_session'; end if;
 if s.status='completed' then return 'already_processed'; end if;
 select * into r from public.pickup_registrations where id=s.registration_id for update;
 select * into g from public.pickup_games where id=r.game_id for update;
 if not g.is_test or s.amount_cents<>p_amount_cents or s.currency<>p_currency
    or g.price_cents<>p_amount_cents then
   update public.pickup_stripe_checkout_sessions set status='refund_required',updated_at=now()
    where id=s.id;
   return 'manual_review';
 end if;
 if r.status not in ('pending_payment','offered') or r.payment_status<>'unpaid' then
   update public.pickup_stripe_checkout_sessions set status='refund_required',updated_at=now()
    where id=s.id;
   return 'manual_review';
 end if;
 update public.pickup_registrations set status='confirmed',payment_status='paid',
   payment_verified_at=now(),payment_verified_by=null where id=r.id;
 update public.pickup_stripe_checkout_sessions set status='completed',
  stripe_payment_intent_id=p_payment_intent_id,updated_at=now() where id=s.id;
 insert into public.notification_events(event_key,event_type,game_id,registration_id,payload)
 values ('payment_verified:'||r.id::text,'payment_verified',r.game_id,r.id,
   jsonb_build_object('source','stripe_test','checkout_session_id',p_session_id))
 on conflict(event_key) do nothing;
 return 'confirmed';
end;
$$;
revoke all on function public.confirm_pickup_stripe_test_payment(text,text,integer,text)
 from public,anon,authenticated;
grant execute on function public.confirm_pickup_stripe_test_payment(text,text,integer,text) to service_role;
