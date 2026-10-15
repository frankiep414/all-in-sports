-- Run in Supabase SQL Editor before using game creation.
create table if not exists public.pickup_games (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 3 and 120),
 venue text not null check (char_length(venue) between 3 and 200),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 price_cents integer not null check (price_cents >= 0 and price_cents <= 100000),
 capacity integer not null check (capacity between 2 and 100),
 status text not null default 'draft' check (status in ('draft','published','cancelled')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 constraint valid_game_time check (ends_at > starts_at)
);
alter table public.pickup_games enable row level security;
revoke all on public.pickup_games from anon, authenticated;
create index if not exists pickup_games_starts_at_idx on public.pickup_games(starts_at);
-- Server-only service-role access; no browser write policy.
