# All In Sports release reconciliation — 2026-10-14

## Release rule
Production main and the long-lived launch/player-id-security-and-stats branch have diverged (228 development-only commits and 64 commits on the current fix branch not in development). Do not merge either branch wholesale. No Production changes or live checkout changes without explicit approval.

## Restored in this Preview branch (build succeeded; functional tests outstanding)
- Public homepage navigation: /play, /compete, /events.
- Play: existing pickup listing, registration, waitlist and Preview-only Stripe test flow.
- Compete and redesigned Events pages.
- My All In: registration lookup, upcoming game status groups (pending, confirmed, waitlisted).
- Supporting routes: /api/games, /api/games/test, /api/registrations, /api/registrations/zelle, /api/my-games, /api/stripe/checkout.
- Supporting registration email templates.

## Still missing from consolidated Preview / needs controlled integration
- Admin dashboard: app/admin/page.tsx and its authorization route /api/admin/me.
- Pickup admin APIs: /api/admin/games, /api/admin/registrations, /api/admin/payments, /api/admin/waitlist.
- Pickup Stripe test webhook and payment confirmation page: /api/stripe/webhook, /payment/confirmation.
- Notification preferences, announcement delivery, unsubscribe routes and admin notification endpoints.
- Security changes to /api/player and /api/signup must be reconciled with the Production login fix; never overwrite these blindly.
- Original pickup database schema and migration files must be checked against the actual Preview database before running migrations.
- Public Zelle QR asset exists in development, not in this branch; Play page references it. Restore verified original asset before treating the payment instructions UI as complete.
- Production Carmita admin, checkout, webhook and registration routes are live and must remain unchanged during pickup reconciliation.

## Required validation (not yet completed)
1. Build/deployment Ready and correct Preview URL.
2. Existing Player ID sign-in, logout and profile persistence.
3. Pickup games visible from Preview data; capacity and waitlist counts match.
4. Register a test player; pending status appears on My All In.
5. Confirm a test payment using Preview-only test credentials; status changes to confirmed and confirmation is visible.
6. Fill a test game; next signup becomes waitlisted; test promotion and cancellation.
7. Admin access denied for non-admin; admin sees game/registration/payment records.
8. Notification flows are test-only and have unsubscribe protections.
9. Events -> Carmita link and existing Carmita registration pages still work; do not initiate live payments for testing.
10. Compare all changed files against main before requesting Production approval.

Build success alone does not establish any of the functional checks above.
