-- Safe additive change: label Carmita Stripe mode without deleting any registrations.
alter table public.carmita_registrations
  add column if not exists stripe_livemode boolean;

create index if not exists carmita_registrations_stripe_mode_created_idx
  on public.carmita_registrations(stripe_livemode, created_at desc);

-- Verified first LIVE payment from Stripe's merchant payment notification.
-- The payment-intent match and paid status prevent touching other registrations.
update public.carmita_registrations
set stripe_livemode = true
where stripe_payment_intent_id = 'pi_3UQYfTQRD8Z9J4Po0BabYmu3'
  and payment_status = 'paid'
  and stripe_livemode is null;

-- Historical rows without verified payment-mode evidence remain NULL.
-- Do not classify unknown rows as live or delete them.
