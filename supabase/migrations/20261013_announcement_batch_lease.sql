-- Atomic Preview announcement batch lease. Apply in Supabase SQL Editor before deploying API changes.
alter table public.announcement_batch_progress
 add column if not exists lease_owner uuid,
 add column if not exists lease_expires_at timestamptz;

create or replace function public.claim_announcement_batch(p_game_id uuid,p_admin_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare acquired boolean;
begin
 insert into public.announcement_batch_progress(game_id,updated_by,lease_owner,lease_expires_at)
 values(p_game_id,p_admin_id,p_admin_id,now()+interval '5 minutes')
 on conflict (game_id) do update set
  lease_owner=excluded.lease_owner,
  lease_expires_at=excluded.lease_expires_at,
  updated_by=excluded.updated_by,
  updated_at=now()
 where public.announcement_batch_progress.complete=false
   and (public.announcement_batch_progress.lease_expires_at is null
        or public.announcement_batch_progress.lease_expires_at<now())
 returning true into acquired;
 return coalesce(acquired,false);
end $$;

create or replace function public.finish_announcement_batch(
 p_game_id uuid,p_admin_id uuid,p_after_user_id uuid,
 p_processed integer,p_sent integer,p_skipped integer,p_failed integer,p_complete boolean)
returns boolean language plpgsql security definer set search_path=public as $$
declare changed boolean;
begin
 update public.announcement_batch_progress set
 after_user_id=p_after_user_id,
 processed=processed+p_processed,sent=sent+p_sent,skipped=skipped+p_skipped,
 failed=failed+p_failed,complete=p_complete,
 lease_owner=null,lease_expires_at=null,updated_by=p_admin_id,updated_at=now()
 where game_id=p_game_id and lease_owner=p_admin_id
   and lease_expires_at>now() and complete=false
 returning true into changed;
 return coalesce(changed,false);
end $$;

create or replace function public.release_announcement_batch(p_game_id uuid,p_admin_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare changed boolean;
begin
 update public.announcement_batch_progress
 set lease_owner=null,lease_expires_at=null,updated_at=now()
 where game_id=p_game_id and lease_owner=p_admin_id and complete=false
 returning true into changed;
 return coalesce(changed,false);
end $$;

revoke all on function public.claim_announcement_batch(uuid,uuid) from public,anon,authenticated;
revoke all on function public.finish_announcement_batch(uuid,uuid,uuid,integer,integer,integer,integer,boolean) from public,anon,authenticated;
revoke all on function public.release_announcement_batch(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_announcement_batch(uuid,uuid) to service_role;
grant execute on function public.finish_announcement_batch(uuid,uuid,uuid,integer,integer,integer,integer,boolean) to service_role;
grant execute on function public.release_announcement_batch(uuid,uuid) to service_role;
