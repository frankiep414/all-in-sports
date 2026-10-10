import { NextResponse } from 'next/server';

const prices = {
  team: { id: 'price_1UOrKSQRD8Z9J4PooOWS4ZAJ', amount: 25000 },
  individual: { id: 'price_1UOrKUQRD8Z9J4Po6RDEIfu3', amount: 2500 },
  run_walk: { id: 'price_1UOrKVQRD8Z9J4PolGLBJ9ef', amount: 2500 },
} as const;

export async function POST(request: Request) {
  if (process.env.STRIPE_REGISTRATION_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Online registration is not open yet.' }, { status: 503 });
  }
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Checkout is not configured.' }, { status: 503 });
  try {
    const body = await request.json();
    const kind = String(body.kind || '');
    if (!(kind in prices)) return NextResponse.json({ error: 'Invalid registration type.' }, { status: 400 });
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const teamName = String(body.teamName || '').trim();
    const activity = String(body.activity || '').trim();
    if (fullName.length < 2 || fullName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 7 || phone.length > 30) {
      return NextResponse.json({ error: 'Please enter a valid name, email and phone.' }, { status: 400 });
    }
    if (kind === 'team' && (!teamName || teamName.length > 100)) return NextResponse.json({ error: 'Team name is required.' }, { status: 400 });
    if (kind === 'run_walk' && !['run', 'walk'].includes(activity)) return NextResponse.json({ error: 'Choose run or walk.' }, { status: 400 });
    const price = prices[kind as keyof typeof prices];
    // Prevent accidentally using a live price with a test key, or vice versa.
    const expectedMode = process.env.STRIPE_CHECKOUT_MODE;
    if (!['test', 'live'].includes(expectedMode || '') || !secret.startsWith(expectedMode === 'live' ? 'sk_live_' : 'sk_test_')) {
      return NextResponse.json({ error: 'Checkout mode is not configured.' }, { status: 503 });
    }
    const origin = new URL(request.url).origin;
    const data = new URLSearchParams();
    data.set('mode', 'payment');
    data.set('line_items[0][price]', price.id);
    data.set('line_items[0][quantity]', '1');
    data.set('customer_email', email);
    data.set('success_url', origin + '/play-for-carmita/registration/success?session_id={CHECKOUT_SESSION_ID}');
    data.set('cancel_url', origin + '/play-for-carmita/registration?type=' + encodeURIComponent(kind) + '&cancelled=1');
    const metadata: Record<string, string> = { event: 'play_for_carmita_2026', kind, fullName, email, phone, teamName: kind === 'team' ? teamName : '', activity: kind === 'run_walk' ? activity : '' };
    for (const [key, value] of Object.entries(metadata)) data.set('metadata[' + key + ']', value);
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/x-www-form-urlencoded' }, body: data.toString(), cache: 'no-store',
    });
    const session = await response.json();
    if (!response.ok || !session.url) {
      console.error('Stripe Checkout error', session.error?.message || response.status);
      return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Unable to start checkout.' }, { status: 400 });
  }
}
