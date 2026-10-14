import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validSignature(payload: string, header: string, secret: string) {
  const parts = header.split(',').map(part => part.trim().split('='));
  const timestamp = parts.find(p => p[0] === 't')?.[1];
  const signatures = parts.filter(p => p[0] === 'v1').map(p => p[1]);
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const digest = createHmac('sha256', secret).update(timestamp + '.' + payload).digest('hex');
  return signatures.some(sig => /^[0-9a-f]{64}$/i.test(sig) && timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(digest, 'hex')));
}

export async function POST(request: Request) {
  if (!['preview', 'production'].includes(process.env.VERCEL_ENV || '') || process.env.CARMITA_CHECKOUT_ENABLED !== 'true') return Response.json({ error: 'Disabled' }, { status: 503 });
  const secret = process.env.CARMITA_STRIPE_WEBHOOK_SECRET;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const live = process.env.VERCEL_ENV === 'production';
  const stripeKey = process.env.CARMITA_STRIPE_SECRET_KEY || (!live ? process.env.STRIPE_SECRET_KEY : undefined);
  if (!secret?.startsWith('whsec_') || !url || !key || !stripeKey?.startsWith(live ? 'sk_live_' : 'sk_test_')) return Response.json({ error: 'Not configured' }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 200000 || !validSignature(raw, request.headers.get('stripe-signature') || '', secret))
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  let event: any;
  try { event = JSON.parse(raw); } catch { return Response.json({ error: 'Invalid payload' }, { status: 400 }); }
  if (typeof event.id !== 'string' || typeof event.type !== 'string') return Response.json({ error: 'Invalid event' }, { status: 400 });
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type))
    return Response.json({ received: true });
  const session = event.data?.object;
  if (session?.object !== 'checkout.session' || session.payment_status !== 'paid' || session.mode !== 'payment' ||
      typeof session.id !== 'string' || typeof session.metadata?.registration_id !== 'string')
    return Response.json({ received: true });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: reg, error } = await db.from('carmita_registrations')
    .select('id,amount_cents,currency,payment_status,stripe_checkout_session_id')
    .eq('id', session.metadata.registration_id).maybeSingle();
  if (error) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  if (!reg || reg.stripe_checkout_session_id !== session.id || reg.amount_cents !== session.amount_total ||
      reg.currency !== session.currency || event.livemode !== live)
    return Response.json({ error: 'Payment mismatch' }, { status: 400 });
  if (reg.payment_status === 'paid') return Response.json({ received: true });
  if (reg.payment_status !== 'pending') return Response.json({ error: 'Invalid payment state' }, { status: 409 });
  const { error: updateError } = await db.from('carmita_registrations').update({
    payment_status: 'paid',
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    paid_at: new Date().toISOString()
  }).eq('id', reg.id).eq('payment_status', 'pending');
  if (updateError) { console.error('Carmita payment update failed', { code: updateError.code }); return Response.json({ error: 'Retry later' }, { status: 503 }); }
  return Response.json({ received: true });
}
