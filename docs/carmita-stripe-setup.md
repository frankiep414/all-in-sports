# Play for Carmita — Stripe setup (NOT LIVE YET)

The checkout API refuses requests unless STRIPE_REGISTRATION_ENABLED=true.
Keep it unset/false until the full test flow is verified.

## Existing live Stripe prices
- Team: price_1UOrKSQRD8Z9J4PooOWS4ZAJ ($250)
- Individual: price_1UOrKUQRD8Z9J4Po6RDEIfu3 ($25)
- Run/walk: price_1UOrKVQRD8Z9J4PolGLBJ9ef ($25)

## Before enabling
1. Create separate **test-mode** Stripe products/prices. The current IDs are LIVE and cannot be used with a test key. Update the checkout route to use test IDs in test mode before testing.
2. Configure Vercel environment variables STRIPE_SECRET_KEY (server only), STRIPE_CHECKOUT_MODE=test, STRIPE_WEBHOOK_SECRET and STRIPE_REGISTRATION_ENABLED=false. Do not prefix secret keys with NEXT_PUBLIC_.
3. Run supabase/carmita_registrations.sql in Supabase SQL Editor. Existing SUPABASE_URL and SUPABASE_SECRET_KEY must be set.
4. In Stripe Dashboard create webhook destination https://allinsportsnj.com/api/carmita/webhook for checkout.session.completed and checkout.session.async_payment_succeeded; save its signing secret in Vercel.
5. Test a successful payment, a cancellation, invalid input, duplicate webhook delivery and webhook signature rejection. Confirm a paid registration appears once in Supabase. Confirm no registration appears for an unpaid checkout.
6. Only after tests pass, switch to LIVE key, STRIPE_CHECKOUT_MODE=live and live webhook signing secret; deploy and set STRIPE_REGISTRATION_ENABLED=true.
7. Stripe can send its own receipt when enabled in Stripe Dashboard. Custom confirmation emails and organizer dashboard are not implemented yet.

IMPORTANT: No payment buttons should be made public until all of the above is done. Payment completion must be verified by webhook; redirect to success page is not proof of payment.
