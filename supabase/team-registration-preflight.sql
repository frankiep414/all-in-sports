-- Read-only preflight for team registration. Safe to run before the migration.
-- Returns the existing table structure and function definitions needed for review.
SELECT 'registration_columns' AS check_type,
       jsonb_agg(jsonb_build_object('column',column_name,'type',data_type,'nullable',is_nullable)
                 ORDER BY ordinal_position) AS details
FROM information_schema.columns
WHERE table_schema='public' AND table_name='pickup_registrations'
UNION ALL
SELECT 'existing_registration_rows',
       jsonb_build_object('total',count(*),
         'active',count(*) FILTER (WHERE status IN ('pending_payment','confirmed','offered')),
         'waitlisted',count(*) FILTER (WHERE status='waitlisted'))
FROM public.pickup_registrations
UNION ALL
SELECT 'registration_functions',
       coalesce(jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
         'return_type',pg_get_function_result(p.oid)) ORDER BY p.proname), '[]'::jsonb)
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('request_pickup_registration','reconcile_pickup_waitlist',
  'confirm_pickup_stripe_test_payment','confirm_pickup_stripe_live_payment');