-- Play for Carmita registration records. Apply in Supabase SQL Editor before enabling checkout.
create table if not exists public.carmita_registrations (
  id uuid primary key default gen_random_uuid(),
  registration_type text not null check (registration_type in ('team','individual')),
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  team_name text,
  activities text[] not null default '{}',
  amount_cents integer not null check (amount_cents in (2500,25000)),
  currency text not null default 'usd' check (currency='usd'),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint carmita_type_amount check (
    (registration_type='team' and amount_cents=25000 and nullif(trim(team_name),'') is not null)
    or (registration_type='individual' and amount_cents=2500 and team_name is null)
  ),
  constraint carmita_activities check (
    (registration_type='team' and activities=array['soccer']::text[])
    or (registration_type='individual' and cardinality(activities) between 1 and 2 and activities <@ array['soccer','run_walk']::text[])
  )
);
create index if not exists carmita_registrations_status_created_idx
  on public.carmita_registrations(payment_status,created_at desc);
alter table public.carmita_registrations enable row level security;
revoke all on public.carmita_registrations from anon, authenticated;
grant select, insert, update on public.carmita_registrations to service_role;
-- Never permit client-side payment status updates; only server-verified Stripe webhooks.
