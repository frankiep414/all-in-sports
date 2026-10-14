-- Play for Carmita: atomic email-send lease for concurrent Stripe webhook deliveries.
-- PREPARED ONLY: do not run until explicitly reviewed/approved.
-- Existing payment and email-tracking fields are preserved.
alter table public.carmita_registrations
  add column if not exists confirmation_email_lease_owner uuid,
  add column if not exists confirmation_email_lease_expires_at timestamptz;

-- Atomically claim an unsent confirmation for one worker.
-- Expired claims may be reclaimed after a failed/crashed worker.
create or replace function public.carmita_claim_confirmation_email(
  p_registration_id uuid,
  p_owner uuid
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed uuid;
begin
  update public.carmita_registrations
  set confirmation_email_lease_owner = p_owner,
      confirmation_email_lease_expires_at = now() + interval '2 minutes'
  where id = p_registration_id
    and payment_status = 'paid'
    and confirmation_email_status <> 'sent'
    and (
      confirmation_email_lease_owner is null
      or confirmation_email_lease_expires_at < now()
    )
  returning id into claimed;
  return claimed is not null;
end;
$$;

-- Claiming must be server-side only. The API uses the Supabase secret key.
revoke all on function public.carmita_claim_confirmation_email(uuid, uuid) from public, anon, authenticated;
grant execute on function public.carmita_claim_confirmation_email(uuid, uuid) to service_role;
