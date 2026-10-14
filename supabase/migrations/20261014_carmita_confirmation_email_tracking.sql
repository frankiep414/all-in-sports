-- Play for Carmita: additive confirmation-email tracking.
-- REVIEW BEFORE RUNNING. Do not execute against Supabase until approved.
-- Existing registration/payment fields and rows are not changed.
alter table public.carmita_registrations
  add column if not exists confirmation_email_status text not null default 'pending',
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_id text;

-- Existing paid test records will show 'pending' until independently reconciled.
-- Do not assume historical messages were never sent.
-- Restrict values without dropping or rewriting existing data.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'carmita_confirmation_email_status_check'
      and conrelid = 'public.carmita_registrations'::regclass
  ) then
    alter table public.carmita_registrations
      add constraint carmita_confirmation_email_status_check
      check (confirmation_email_status in ('pending', 'sent', 'failed'));
  end if;
end $$;
