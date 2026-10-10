-- Run once in Supabase SQL Editor before enabling the Stripe webhook.
create table if not exists public.carmita_registrations (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  kind text not null check (kind in ('team','individual','run_walk')),
  full_name text not null,
  email text not null,
  phone text not null,
  team_name text,
  activity text,
  amount_cents integer not null,
  payment_status text not null default 'paid',
  created_at timestamptz not null default now()
);
alter table public.carmita_registrations enable row level security;
-- No anonymous/public policies: only the server-side service role may access registrations.
