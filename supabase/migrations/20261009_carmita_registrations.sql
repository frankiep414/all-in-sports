-- Run this migration in the existing Supabase project's SQL editor before enabling registration.
-- Only the server-side secret key may insert/read registrations.
create table if not exists public.carmita_registrations (
  id uuid primary key,
  registration_type text not null check (registration_type in ('team', 'player', 'run', 'walk')),
  contact_name text not null,
  email text not null,
  phone text not null,
  team_name text,
  notes text not null default '',
  amount_usd integer not null check (amount_usd in (25, 250)),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);
alter table public.carmita_registrations enable row level security;
-- No public policies: access is only via the server's service/secret role.
