import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
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
  if (!secret?.startsWith('whsec_') || !url || !key || !(live ? /^(sk_live_|rk_live_)/.test(stripeKey || '') : /^(sk_test_|rk_test_)/.test(stripeKey || ''))) return Response.json({ error: 'Not configured' }, { status: 503 });
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
      typeof session.id !== 'string' || (typeof session.metadata?.registration_id !== 'string' && typeof session.metadata?.donation_id !== 'string'))
    return Response.json({ received: true });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Donation checkouts are separate from event participation registrations.
  if(typeof session.metadata?.donation_id==='string'){
    const {data:donation,error:lookupError}=await db.from('carmita_donations')
      .select('id,donor_name,donor_email,amount_cents,currency,payment_status,stripe_checkout_session_id,stripe_livemode,receipt_email_status')
      .eq('id',session.metadata.donation_id).maybeSingle();
    if(lookupError)return Response.json({error:'Donation lookup unavailable'},{status:503});
    if(!donation||donation.stripe_checkout_session_id!==session.id||
       donation.amount_cents!==session.amount_total||donation.currency!==session.currency||
       donation.stripe_livemode!==event.livemode)return Response.json({error:'Donation payment mismatch'},{status:400});
    if(!['paid','pending'].includes(donation.payment_status))return Response.json({error:'Invalid donation state'},{status:409});
    if(donation.payment_status==='pending'){
      const {data:updated,error:updateError}=await db.from('carmita_donations').update({
        payment_status:'paid',paid_at:new Date().toISOString(),
        stripe_payment_intent_id:typeof session.payment_intent==='string'?session.payment_intent:null
      }).eq('id',donation.id).eq('payment_status','pending').select('id').maybeSingle();
      if(updateError||!updated)return Response.json({error:'Donation payment update retry'},{status:503});
    }
    if(donation.receipt_email_status!=='sent'){
      const key=process.env.CARMITA_RESEND_API_KEY;
      if(!key)return Response.json({error:'Donation receipt email not configured'},{status:503});
      const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
      const amount=(donation.amount_cents/100).toFixed(2);
      const receipt=await fetch('https://api.resend.com/emails',{method:'POST',headers:{
        Authorization:`Bearer ${key}`,'Content-Type':'application/json',
        'Idempotency-Key':`carmita-donation-receipt-${donation.id}`
      },body:JSON.stringify({
        from:'All In Sports | Play for Carmita <events@allinsportsnj.com>',
        to:[donation.donor_email],reply_to:'allinsports.imom@gmail.com',
        subject:'Thank you for supporting Play for Carmita ❤️',
        html:`<h1>Thank you, ${esc(donation.donor_name)}!</h1><p>We received your ${amount} donation in support of Play for Carmita.</p><p>All In Sports is collecting contributions and will donate event proceeds to the Brain Aneurysm Foundation.</p><p>This is a payment acknowledgment, not a charitable tax receipt.</p>`
      }),signal:AbortSignal.timeout(20000),cache:'no-store'}).catch(()=>null);
      if(!receipt?.ok)return Response.json({error:'Donation receipt retry'},{status:503});
      const receiptData=await receipt.json().catch(()=>({}));
      const {error:markError}=await db.from('carmita_donations').update({
        receipt_email_status:'sent',receipt_email_id:typeof receiptData.id==='string'?receiptData.id:null
      }).eq('id',donation.id);
      if(markError)return Response.json({error:'Donation receipt tracking retry'},{status:503});
    }
    return Response.json({received:true});
  }
  const { data: reg, error } = await db.from('carmita_registrations')
    .select('id,amount_cents,currency,payment_status,stripe_checkout_session_id,confirmation_email_status')
    .eq('id', session.metadata.registration_id).maybeSingle();
  if (error) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  if (!reg || reg.stripe_checkout_session_id !== session.id || reg.amount_cents !== session.amount_total ||
      reg.currency !== session.currency || event.livemode !== live)
    return Response.json({ error: 'Payment mismatch' }, { status: 400 });
  if (reg.payment_status !== 'paid' && reg.payment_status !== 'pending') return Response.json({ error: 'Invalid payment state' }, { status: 409 });
  if (reg.payment_status === 'pending') {
  const { data: updatedRegistration, error: updateError } = await db.from('carmita_registrations').update({
    payment_status: 'paid',
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    stripe_livemode: event.livemode,
    paid_at: new Date().toISOString()
  }).eq('id', reg.id).eq('payment_status', 'pending')
    .select('id').maybeSingle();
  if (updateError) { console.error('Carmita payment update failed', { code: updateError.code }); return Response.json({ error: 'Retry later' }, { status: 503 }); }
  if (!updatedRegistration) {
    // Another delivery may have processed this registration concurrently.
    // Retry so the next delivery re-reads the persisted payment state.
    return Response.json({ error: 'Payment state changed; retry' }, { status: 503 });
  }
  }
  if (reg.confirmation_email_status === 'sent') return Response.json({ received: true });
  // Atomically lease this paid registration before any email attempt.
  // A competing webhook must retry rather than send a second email.
  const leaseOwner = randomUUID();
  const { data: claimed, error: claimError } = await db.rpc('carmita_claim_confirmation_email', {
    p_registration_id: reg.id,
    p_owner: leaseOwner
  });
  if (claimError) {
    console.error('Carmita email lease claim failed', { code: claimError.code });
    return Response.json({ error: 'Email claim retry' }, { status: 503 });
  }
  if (claimed !== true) {
    // Another delivery may be sending, or may have finished since our first read.
    // Retry later to re-read the final email status.
    return Response.json({ error: 'Email claim busy; retry' }, { status: 503 });
  }
  async function releaseLease(status?: 'failed') {
    const changes: Record<string, string | null> = {
      confirmation_email_lease_owner: null,
      confirmation_email_lease_expires_at: null
    };
    if (status) changes.confirmation_email_status = status;
    const { error: releaseError } = await db.from('carmita_registrations').update(changes)
      .eq('id', reg.id).eq('confirmation_email_lease_owner', leaseOwner)
      .neq('confirmation_email_status', 'sent');
    if (releaseError) console.error('Carmita email lease release failed', { code: releaseError.code });
  }
  const emailKey = process.env.CARMITA_RESEND_API_KEY;
  // Do not silently acknowledge a paid registration without attempting its confirmation email.
  // Returning 503 allows Stripe to retry delivery after the missing configuration is restored.
  if (!emailKey) {
    console.error('Carmita confirmation email is not configured');
    await releaseLease('failed');
    return Response.json({ error: 'Confirmation email not configured' }, { status: 503 });
  }
  const from = 'All In Sports | Play for Carmita <events@allinsportsnj.com>';
  {
    const { data: details, error: detailsError } = await db.from('carmita_registrations')
      .select('contact_name,contact_email,registration_type,team_name,activities,amount_cents').eq('id', reg.id).single();
    if (detailsError || !details) { await releaseLease('failed'); return Response.json({ error: 'Email details unavailable' }, { status: 503 }); }
    const escape = (v: string) => v.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c] || c));
    const activities = (details.activities || []).map((a: string) => a === 'run_walk' ? 'Run / Walk' : 'Soccer').join(' + ');
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1>Thank you for playing for Carmita! ❤️⚽</h1><p>Hi ${escape(details.contact_name)},</p><p><strong>Your registration and payment are confirmed.</strong> Thank you for supporting brain aneurysm awareness.</p><p><strong>Registration:</strong> ${details.registration_type === 'team' ? 'Full soccer team' : 'Individual'}<br>${details.team_name ? `<strong>Team:</strong> ${escape(details.team_name)}<br>` : ''}<strong>Activities:</strong> ${escape(activities)}<br><strong>Amount:</strong> ${(details.amount_cents / 100).toFixed(2)}</p><p><strong>Saturday, October 31, 2026 · 9 AM–1 PM</strong><br>Harrison High School, Harrison, NJ</p><p>We look forward to seeing you!</p><p>All In Sports</p></div>`;
    let mail: Response;
    try {
      mail = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${emailKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `carmita-${reg.id}` }, body: JSON.stringify({ from, to: [details.contact_email], reply_to: 'allinsports.imom@gmail.com', subject: 'Play for Carmita — Registration Confirmed', html }), cache: 'no-store', signal: AbortSignal.timeout(20000) });
    } catch {
      console.error('Carmita confirmation email request failed');
      await releaseLease('failed');
      return Response.json({ error: 'Email delivery retry' }, { status: 503 });
    }
    if (!mail.ok) {
      console.error('Carmita email delivery failed', { status: mail.status });
      await releaseLease('failed');
      return Response.json({ error: 'Email delivery retry' }, { status: 503 });
    }
    let emailId: string | null = null;
    try {
      const receipt = await mail.json();
      emailId = typeof receipt?.id === 'string' ? receipt.id : null;
    } catch { /* Resend accepted the request, but its response was not parseable. */ }
    const { data: markedSent, error: emailUpdateError } = await db.from('carmita_registrations').update({
      confirmation_email_status: 'sent',
      confirmation_email_sent_at: new Date().toISOString(),
      confirmation_email_id: emailId,
      confirmation_email_lease_owner: null,
      confirmation_email_lease_expires_at: null
    }).eq('id', reg.id).eq('confirmation_email_lease_owner', leaseOwner)
      .neq('confirmation_email_status', 'sent').select('id').maybeSingle();
    if (emailUpdateError || !markedSent) {
      console.error('Carmita email tracking update failed', { code: emailUpdateError?.code || 'NO_ROW_UPDATED' });
      // Resend may have accepted the email. Keep the same idempotency key on retry.
      return Response.json({ error: 'Email tracking retry' }, { status: 503 });
    }
  }
  return Response.json({ received: true });
}
