import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 12000) return Response.json({ error: 'Request is too large.' }, { status: 413 });
    const body = JSON.parse(raw);
    if (body.website) return Response.json({ success: true, registrationId: 'RECEIVED' });
    const type = body.type;
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const teamName = type === 'team' ? String(body.teamName || '').trim() : null;
    const notes = String(body.notes || '').trim();
    const prices: Record<string, number> = { team: 250, player: 25, run: 25, walk: 25 };
    if (!Object.prototype.hasOwnProperty.call(prices, type) ||
      !name || name.length > 120 || !email || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !phone || phone.length > 35 || notes.length > 1000 ||
      (type === 'team' && (!teamName || teamName.length > 120))) {
      return Response.json({ error: 'Please check the required registration details.' }, { status: 400 });
    }
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) return Response.json({ error: 'Registration is not configured yet. Please try again later.' }, { status: 503 });
    const registrationId = randomUUID();
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await db.from('carmita_registrations').insert({
      id: registrationId, registration_type: type, contact_name: name,
      email, phone, team_name: teamName, notes, amount_usd: prices[type],
      status: 'pending_payment',
    });
    if (error) {
      console.error('Carmita registration insert failed', error);
      return Response.json({ error: 'Registration is temporarily unavailable. Please try again later.' }, { status: 503 });
    }
    // Confirmation email is best-effort; registration is saved even if delivery fails.
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'All In Sports <welcome@allinsportsnj.com>',
            to: [email],
            subject: 'Play for Carmita — registration request received',
            text: `Hi ${name},\n\nWe received your Play for Carmita registration request.\n\nRegistration: ${type}\nAmount: $${prices[type]}\nReference: ${registrationId}\n\nSaturday, October 31, 2026, 9 AM–1 PM\nHarrison High School, Harrison, NJ\n\nNo payment has been collected and your spot is not confirmed yet. Our team will follow up with payment details.\n\nAll In Sports`,
          }),
        });
      } catch (error) { console.error('Carmita email delivery failed', error); }
    }
    return Response.json({ success: true, registrationId });
  } catch (error) {
    console.error('Carmita registration error', error);
    return Response.json({ error: 'Unable to process registration.' }, { status: 400 });
  }
}
