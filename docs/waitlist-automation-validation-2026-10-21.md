# Waitlist automation validation — 2026-10-21

## Result: BLOCKED — do not run automatic-waitlist-promotion.sql in Production

Static integration review of PR #37 and PR #38 identified:

1. **No automatic email on trigger promotions.** PR #37 sends emails only from POST /api/admin/waitlist after manual reconciliation. PR #38 changes registrations directly in PostgreSQL; it never invokes the email route.
2. **Lock-order deadlock risk.** Existing request_pickup_registration and reconcile_pickup_waitlist acquire pickup_games FOR UPDATE before modifying pickup_registrations. PR #38's AFTER UPDATE row trigger acquires the registration lock first, then pickup_games FOR UPDATE. Concurrent requests can deadlock.
3. **Expired offers are not automatically processed.** PostgreSQL triggers do not run merely because offer_expires_at passes. An authenticated scheduled worker or equivalent must process expirations.
4. **Email retry/recovery missing.** PR #37 sends synchronously after mutation. If the request fails between promotion and sending, subsequent reconciliation sees no newly offered registration and never retries the notification. An outbox/worker with idempotent delivery and auditable failures is needed.
5. **Existing 10 AM UI copy is stale** after the production cutoff migration; the admin button says only use after 10 AM even though rules now allow offers up to kickoff.
6. **Payment-offer expiry enforcement must be checked in Stripe checkout** before activation. Current checkout route checks offered status but not offer_expires_at, allowing a payment session to be created after the offer deadline unless other checks reject it.

## Required fixes before activation
- Use one database transaction with consistent lock ordering (game before registrations), or a safe, serialized database function for all release/promotion transitions.
- Persist an outbox event atomically when an offer is created. Email worker claims and delivers the event with durable status and no duplicate sends.
- Add a scheduled sweep for expired offers before kickoff, with monitoring and appropriate retries.
- Enforce offer_expires_at when starting payment checkout, and handle payment sessions already open at expiration safely.
- Run tests for FIFO order, available capacity, simultaneous registrations/withdrawals, expiration, duplicate requests, and Resend failure.
- Verify in isolated Preview/test Supabase project, then merge and explicitly apply reviewed SQL to Production.

**Neither PR #37 nor #38 should be merged or activated on the strength of a successful Vercel build alone.**
