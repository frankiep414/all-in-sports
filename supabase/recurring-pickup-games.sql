-- Run once in Supabase SQL Editor before creating recurring games.
alter table public.pickup_games
  add column if not exists series_id uuid,
  add column if not exists occurrence_index integer;

alter table public.pickup_games
  drop constraint if exists pickup_games_occurrence_index_check;
alter table public.pickup_games
  add constraint pickup_games_occurrence_index_check
  check (occurrence_index is null or occurrence_index between 1 and 16);

create index if not exists pickup_games_series_id_idx
  on public.pickup_games(series_id);

-- Existing games are unchanged. Their series_id remains NULL.
