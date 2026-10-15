# Pickup payments and announcement production activation (2026-10-15)

This release **prepares** live pickup checkout and opt-in announcement batches; it does **not** enable either. Do not merge or activate without owner approval. Carmita checkout and webhook remain separate and unchanged.

## Live pickup Stripe
- In Vercel Production only, configure `PICKUP_STRIPE_LIVE_SECRET_KEY` with the intended Stripe live secret key (`sk_live_`), separate from Carmita credentials.
- Register a **live-mode Stripe webhook endpoint** `https://allinsportsnj.com/api/stripe/webhook` for `checkout.session.completed`; set its unique signing secret as `PICKUP_STRIPE_LIVE_WEBHOOK_SECRET` in Production.
- Review and apply `supabase/migrations/20261015_pickup_stripe_live_payment_confirmation.sql` in the intended Production Supabase project. This is a separate function; the Preview test confirmation function remains intact.
- Confirm the existing pickup registration and checkout session tables are present in that project. Existing Preview admin game/roster tests are evidence of schema presence only for that environment.
- Only after credentials, webhook and database prerequisites are verified, explicitly set `PICKUP_STRIPE_LIVE_ENABLED=true` in Production. Default is off. Live checkout requires a signed-in confirmed user, their eligible unpaid registration, a published upcoming non-test game, and live Stripe credentials.
- Verify the new live-only configuration with a tightly controlled transaction and webhook reconciliation before general availability; do not repeat the already tested Preview lifecycle.

## Live opt-in announcements
- In Production, set `NEXT_PUBLIC_SITE_URL=https://allinsportsnj.com`, configure `RESEND_API_KEY` and the original announcement batch SQL functions and tables.
- Keep `PICKUP_ANNOUNCEMENT_LIVE_ENABLED` unset/false until explicitly approved. Enabling permits an authorized admin to send to opted-in email recipients using the existing confirmed batch workflow; it does **not** automatically send on publish.
- Optional `PICKUP_ANNOUNCEMENT_BATCH_ALLOWLIST` limits Production recipients for a small launch pilot. Preview still **requires** an allowlist.
- Review recipient opt-in, unsubscribe, rate/volume and sending-domain readiness before any live send. No actual announcement emails have been sent by preparing this release.

## Release controls
- PR #6 is draft; merging or live activation requires explicit user approval.
- The two Production enable flags are independent and default off.
- Carmita live Stripe endpoints and credentials are not modified by these changes.
