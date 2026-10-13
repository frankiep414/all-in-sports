-- New-game marketing consent is opt-in, independently by channel.
-- Apply only after reviewing against the current Supabase schema.
create table if not exists public.player_announcement_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email_opt_in boolean not null default false,
 sms_opt_in boolean not null default false,
 email_updated_at timestamptz,
 sms_updated_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.player_announcement_preferences enable row level security;
revoke all on public.player_announcement_preferences from anon, authenticated;
-- Access only through authenticated server routes using the service role.
-- SMS sending additionally requires documented express consent, phone verification,
-- STOP handling, and an approved SMS provider; this table alone is not sufficient.
