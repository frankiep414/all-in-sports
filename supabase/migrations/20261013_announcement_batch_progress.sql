-- Durable per-game Preview announcement batch checkpoints.
-- Run in Supabase SQL Editor before enabling server checkpoint reads/writes.
create table if not exists public.announcement_batch_progress (
  game_id uuid primary key references public.pickup_games(id) on delete cascade,
  after_user_id uuid,
  processed integer not null default 0 check (processed >= 0),
  sent integer not null default 0 check (sent >= 0),
  skipped integer not null default 0 check (skipped >= 0),
  failed integer not null default 0 check (failed >= 0),
  complete boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.announcement_batch_progress enable row level security;
revoke all on public.announcement_batch_progress from anon, authenticated;
grant select, insert, update on public.announcement_batch_progress to service_role;
create index if not exists announcement_batch_progress_updated_at_idx
 on public.announcement_batch_progress(updated_at desc);
