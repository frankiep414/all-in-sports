-- All In Sports: registration foundation. Run once in Supabase SQL Editor.
-- A registration is a REQUEST, not a paid/confirmed spot.
create table if not exists public.pickup_registrations (
 id uuid primary key default gen_random_uuid(),
 game_id uuid not null references public.pickup_games(id) on delete restrict,
 player_id uuid not null references public.players(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 status text not null default 'pending_payment'
   check (status in ('pending_payment','confirmed','cancelled')),
 payment_status text not null default 'unpaid'
   check (payment_status in ('unpaid','pending_verification','paid','refunded')),
 created_at timestamptz not null default now(),
 unique (game_id,user_id)
);
create index if not exists pickup_registrations_game_idx
 on public.pickup_registrations(game_id,status);
alter table public.pickup_registrations enable row level security;
revoke all on public.pickup_registrations from anon,authenticated;
grant select,insert,update on public.pickup_registrations to service_role;
-- Enforce capacity and one registration per verified user atomically.
-- Pending registrations reserve a provisional place; only payment confirmation
-- can change their status to confirmed in a later admin-only workflow.
create or replace function public.request_pickup_registration(
 p_game_id uuid,p_player_id uuid,p_user_id uuid
) returns table(registration_id uuid,registration_status text) 
language plpgsql security definer
set search_path = public,pg_temp
as $$
declare v_game public.pickup_games%rowtype;
        v_id uuid;
        v_status text;
        v_count integer;
begin
 select * into v_game from public.pickup_games where id=p_game_id for update;
 if not found or v_game.status <> 'published' or v_game.starts_at <= now() then
  raise exception 'GAME_UNAVAILABLE';
 end if;
 select id,status into v_id,v_status from public.pickup_registrations
  where game_id=p_game_id and user_id=p_user_id;
 if found then
  if v_status='cancelled' then raise exception 'REGISTRATION_CANCELLED'; end if;
  return query select v_id,v_status;
  return;
 end if;
 select count(*) into v_count from public.pickup_registrations
  where game_id=p_game_id and status in ('pending_payment','confirmed');
 if v_count>=v_game.capacity then raise exception 'GAME_FULL'; end if;
 insert into public.pickup_registrations(game_id,player_id,user_id)
  values(p_game_id,p_player_id,p_user_id) returning id,status into v_id,v_status;
 return query select v_id,v_status;
end;
$$;
revoke all on function public.request_pickup_registration(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.request_pickup_registration(uuid,uuid,uuid) to service_role;
