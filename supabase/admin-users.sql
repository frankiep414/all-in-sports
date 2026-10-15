-- Run in Supabase SQL Editor only after confirming both verified auth identities.
-- Admin permissions are separate from player profile fields.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
-- No client-side policies: admin membership is read only by trusted server using service role.
revoke all on public.admin_users from anon, authenticated;
-- Check the verified identity before inserting. Never promote by a client-supplied email.
select id, email, email_confirmed_at from auth.users
where lower(email) in ('francisco.x.garcia1414@gmail.com', 'garciachristian12@gmail.com');
-- After checking both identities above are correct and verified, uncomment to grant access:
-- insert into public.admin_users(user_id)
-- select id from auth.users where lower(email) in ('francisco.x.garcia1414@gmail.com', 'garciachristian12@gmail.com')
-- and email_confirmed_at is not null
-- on conflict (user_id) do nothing;
