-- All In Sports: Stripe Checkout groundwork (no charges, no checkout enabled).
-- Run after pickup-registrations.sql and payment-references.sql.
-- Payment confirmation MUST come from verified Stripe webhook, never a browser redirect.
create table if not exists public.pickup_stripe_checkout_sessions (
 id uuid primary key default gen_random_uuid(),
 registration_id uuid not null references public.pickup_registrations(id) on delete restrict,
 stripe_checkout_session_id text not null unique,
 stripe_payment_intent_id text,
 amount_cents integer not null check (amount_cents >= 0),
 currency text not null default 'usd' check (currency = 'usd'),
 status text not null default 'open'
  check (status in ('open','completed','expired','payment_failed','refund_required')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists pickup_stripe_checkout_registration_idx
 on public.pickup_stripe_checkout_sessions(registration_id);
create unique index if not exists pickup_stripe_checkout_payment_intent_unique
 on public.pickup_stripe_checkout_sessions(stripe_payment_intent_id)
 where stripe_payment_intent_id is not null;
create table if not exists public.pickup_stripe_webhook_events (
 stripe_event_id text primary key,
 event_type text not null,
 status text not null default 'processing'
  check (status in ('processing','processed','failed')),
 created_at timestamptz not null default now(),
 processed_at timestamptz
);
alter table public.pickup_stripe_checkout_sessions enable row level security;
alter table public.pickup_stripe_webhook_events enable row level security;
revoke all on public.pickup_stripe_checkout_sessions from anon,authenticated;
revoke all on public.pickup_stripe_webhook_events from anon,authenticated;
grant select,insert,update on public.pickup_stripe_checkout_sessions to service_role;
grant select,insert,update on public.pickup_stripe_webhook_events to service_role;
