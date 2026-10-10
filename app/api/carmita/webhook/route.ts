import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signingSecret) return new Response('Unavailable', { status: 503 });
  const payload = await request.text();
  const header = request.headers.get('stripe-signature') || '';
  const timestamp = header.split(',').find(x => x.startsWith('t='))?.slice(2);
  const candidates = header.split(',').filter(x => x.startsWith('v1=')).map(x => x.slice(3));
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return new Response('Invalid signature', { status: 400 });
  const signature = createHmac('sha256', signingSecret).update(timestamp + '.' + payload).digest();
  const verified = candidates.some(candidate => {
    if (!/^[a-f0-9]{64}$/.test(candidate)) return false;
    return timingSafeEqual(signature, Buffer.from(candidate, 'hex'));
  });
  if (!verified) return new Response('Invalid signature', { status: 400 });
  const event = JSON.parse(payload);
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return new Response('OK');
  const session = event.data.object;
  if (session.payment_status !== 'paid' || session.metadata?.event !== 'play_for_carmita_2026') return new Response('OK');
  const expected: Record<string, number> = { team: 25000, individual: 2500, run_walk: 2500 };
  const kind = session.metadata.kind;
  if (!(kind in expected) || session.amount_total !== expected[kind] || session.currency !== 'usd') return new Response('Invalid order', { status: 400 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return new Response('Unavailable', { status: 503 });
  const db = createClient(url, key);
  const { error } = await db.from('carmita_registrations').upsert({
    stripe_session_id: session.id, stripe_payment_intent_id: session.payment_intent || null,
    kind, full_name: session.metadata.fullName, email: session.metadata.email,
    phone: session.metadata.phone, team_name: session.metadata.teamName || null,
    activity: session.metadata.activity || null, amount_cents: session.amount_total,
    payment_status: 'paid',
  }, { onConflict: 'stripe_session_id' });
  if (error) { console.error('Registration persistence failed', error); return new Response('Retry', { status: 500 }); }
  return new Response('OK');
}
