-- Run before enabling the donation checkout flow.
create table if not exists public.carmita_donations (
 id uuid primary key,
 donor_name text not null,
 donor_email text not null,
 amount_cents integer not null check(amount_cents between 100 and 1000000),
 currency text not null default 'usd' check(currency='usd'),
 payment_status text not null default 'pending' check(payment_status in ('pending','paid','refunded')),
 stripe_livemode boolean not null,
 stripe_checkout_session_id text unique,
 stripe_payment_intent_id text,
 created_at timestamptz not null default now(),
 paid_at timestamptz,
 receipt_email_status text not null default 'pending' check(receipt_email_status in ('pending','sent')),
 receipt_email_id text
);
create index if not exists carmita_donations_status_created_idx on public.carmita_donations(payment_status,created_at desc);
alter table public.carmita_donations enable row level security;
revoke all on public.carmita_donations from anon,authenticated;
grant select,insert,update on public.carmita_donations to service_role;
