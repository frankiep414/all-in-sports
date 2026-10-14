import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function response(error: string, status: number) { return NextResponse.json({ error }, { status }); }
function clean(v: unknown, max: number) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }

export async function POST(req: NextRequest) {
  // Checkout is intentionally disabled until Stripe live-mode configuration and webhook QA.
  if (!['preview', 'production'].includes(process.env.VERCEL_ENV || '') || process.env.CARMITA_CHECKOUT_ENABLED !== 'true') return response('Registration payments are not enabled yet.', 503);
  const live = process.env.VERCEL_ENV === 'production';
  const stripeKey = process.env.CARMITA_STRIPE_SECRET_KEY || (!live ? process.env.STRIPE_SECRET_KEY : undefined);
  const dbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbKey = process.env.SUPABASE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!(live ? /^(sk_live_|rk_live_)/.test(stripeKey || '') : /^(sk_test_|rk_test_)/.test(stripeKey || '')) || !dbUrl || !dbKey || !siteUrl || !/^https:\/\//.test(siteUrl) || (live && new URL(siteUrl).hostname !== 'allinsportsnj.com' && live && new URL(siteUrl).hostname !== 'www.allinsportsnj.com')) return response('Checkout is not configured.', 503);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return response('Invalid request.', 400); }
  const type = body.registrationType;
  if (type !== 'team' && type !== 'individual') return response('Choose a registration type.', 400);
  const name = clean(body.contactName, 120), email = clean(body.contactEmail, 254).toLowerCase();
  const phone = clean(body.contactPhone, 40), teamName = clean(body.teamName, 120);
  const activities = type === 'team' ? ['soccer'] : Array.isArray(body.activities) ?
    [...new Set(body.activities.filter((a): a is string => a === 'soccer' || a === 'run_walk'))] : [];
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (type === 'team' && !teamName) || (type === 'individual' && activities.length === 0))
    return response('Please complete all required fields.', 400);
  const amount = type === 'team' ? 25000 : 2500;
  const db = createClient(dbUrl, dbKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const id = randomUUID();
  const { error: insertError } = await db.from('carmita_registrations').insert({
    id, registration_type: type, contact_name: name, contact_email: email,
    contact_phone: phone || null, team_name: type === 'team' ? teamName : null,
    activities, amount_cents: amount, payment_status: 'pending', stripe_livemode: live
  });
  if (insertError) { console.error('Carmita registration insert failed', { code: insertError.code }); return response('Unable to start registration.', 503); }
  try {
    const params = new URLSearchParams({
      mode: 'payment',
      success_url: `${siteUrl.replace(/\/$/, '')}/play-for-carmita/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl.replace(/\/$/, '')}/play-for-carmita?payment=cancelled`,
      customer_email: email,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(amount),
      'line_items[0][price_data][product_data][name]': type === 'team' ? 'Play for Carmita — Team Registration' : 'Play for Carmita — Individual Registration',
      'line_items[0][quantity]': '1',
      'metadata[registration_id]': id,
      'payment_intent_data[metadata][registration_id]': id
    });
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `carmita-registration-${id}`
      }, body: params.toString(), cache: 'no-store'
    });
    const session = await r.json() as { id?: string; url?: string; error?: { message?: string } };
    if (!r.ok || !session.id || !session.url || !session.url.startsWith('https://checkout.stripe.com/'))
      throw new Error('Stripe checkout session creation failed');
    const { data: linkedRegistration, error: saveError } = await db.from('carmita_registrations')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', id).eq('payment_status', 'pending')
      .select('id').maybeSingle();
    if (saveError || !linkedRegistration) {
      console.error('Carmita session link failed', { code: saveError?.code || 'NO_ROW_UPDATED' });
      // Never return a checkout URL that is not linked to a registration.
      // Expire the orphaned Stripe session as a best-effort cleanup.
      try {
        const expired = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session.id)}/expire`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${stripeKey}` },
          cache: 'no-store'
        });
        if (!expired.ok) console.error('Carmita orphaned session expiration failed', { status: expired.status });
      } catch { console.error('Carmita orphaned session expiration request failed'); }
      return response('Unable to finish checkout setup.', 503);
    }
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (e) {
    console.error('Carmita checkout creation failed', e instanceof Error ? e.message : 'Unknown error');
    return response('Unable to open secure checkout. Please try again.', 503);
  }
}
