-- Run in Supabase SQL Editor after pickup-registrations.sql.
-- Assigns a stable, unique, human-readable payment reference to every registration.
-- Safe to rerun. Does not enable payments or notifications.
CREATE SEQUENCE IF NOT EXISTS public.pickup_payment_reference_seq;
REVOKE ALL ON SEQUENCE public.pickup_payment_reference_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SEQUENCE public.pickup_payment_reference_seq TO service_role;
ALTER TABLE public.pickup_registrations ADD COLUMN IF NOT EXISTS payment_reference text;
CREATE OR REPLACE FUNCTION public.assign_pickup_payment_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.payment_reference IS NULL THEN
  NEW.payment_reference := 'AIS-' || lpad(nextval('public.pickup_payment_reference_seq')::text,6,'0');
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS pickup_payment_reference_insert ON public.pickup_registrations;
CREATE TRIGGER pickup_payment_reference_insert
 BEFORE INSERT ON public.pickup_registrations FOR EACH ROW
 EXECUTE FUNCTION public.assign_pickup_payment_reference();
UPDATE public.pickup_registrations
 SET payment_reference='AIS-' || lpad(nextval('public.pickup_payment_reference_seq')::text,6,'0')
 WHERE payment_reference IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pickup_payment_reference_unique
 ON public.pickup_registrations(payment_reference);
ALTER TABLE public.pickup_registrations ALTER COLUMN payment_reference SET NOT NULL;
