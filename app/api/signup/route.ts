import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    const authUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!token || !authUrl || !publicKey) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const authClient = createClient(authUrl, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user?.email) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const body = await request.json();

    const {
      fullName,
      phone,
      email,
      playedBefore,
      teamName,
      divisions,
      smsConsent,
      emailConsent,
    } = body;

    if (!fullName || !phone || !email || typeof fullName !== 'string' || typeof phone !== 'string' || typeof email !== 'string' || email.trim().toLowerCase() !== user.email.toLowerCase()) {
      return Response.json(
        { error: 'Name, phone, and email are required.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error('Missing Supabase environment variables');

      return Response.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);

    const { data: existing, error: lookupError } = await supabase.from('players')
      .select('id').ilike('email', user.email).maybeSingle();
    if (lookupError) return Response.json({ error: 'Unable to check existing Player ID.' }, { status: 500 });
    if (existing) return Response.json({ success: true, playerId: existing.id, existing: true });

   const { data: newPlayer, error } = await supabase.from('players').insert({
      full_name: fullName,
      phone,
      email: user.email,
      played_before: Boolean(playedBefore),
      team_name: playedBefore ? teamName || null : null,
      divisions:
        playedBefore && Array.isArray(divisions) ? divisions : null,
      sms_consent: Boolean(smsConsent),
      sms_consent_at: smsConsent ? new Date().toISOString() : null,
      consent_source: 'player_signup_popup',
}).select('id').single();

    if (error) {
      console.error('Supabase signup error:', error);

      return Response.json(
        { error: 'Unable to save signup.' },
        { status: 500 }
      );
    }

    // Persist SMS announcement permission in the dedicated notification preferences table.
    // Never treat a phone number alone as consent. Only a checked signup box opts in.
    // US signup phone numbers are normalized to E.164 for Twilio delivery.
    const digits = phone.replace(/\D/g, '');
    const phoneE164 = digits.length === 10 ? '+1' + digits :
      digits.length === 11 && digits.startsWith('1') ? '+' + digits : null;
    if (smsConsent === true && !phoneE164) {
      return Response.json({
        success: false, playerId: newPlayer.id, signupSaved: true,
        error: 'Player ID created, but the phone number could not be prepared for SMS announcements. Please contact support to update your number.'
      }, { status: 422 });
    }
    const { error: smsPreferenceError } = await supabase.from('notification_preferences').upsert({
      user_id: user.id,
      sms_opted_in: smsConsent === true,
      sms_game_alerts: smsConsent === true,
      sms_transactional: false,
      phone_e164: phoneE164,
      sms_consented_at: smsConsent === true ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (smsPreferenceError) {
      console.error('SMS announcement preference save failed', smsPreferenceError.code);
      return Response.json({
        success: false, playerId: newPlayer.id, signupSaved: true,
        error: 'Player ID created, but SMS notification preferences could not be saved. Please contact support before relying on text alerts.'
      }, { status: 503 });
    }

    // Notify the internal admin inbox once for each newly created Player ID.
    // This is an operational notification, not a marketing email.
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        console.error('New member admin notification: RESEND_API_KEY missing');
      } else {
        const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char] || char));
        const name = fullName.trim();
        const memberEmail = user.email;
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `all-in-new-member-${newPlayer.id}`,
          },
          body: JSON.stringify({
            from: 'All In Sports <noreply@allinsportsnj.com>',
            to: ['allinsports.imom@gmail.com'],
            subject: 'New All In Sports member: ' + name.replace(/[\\r\\n]/g, ' ').slice(0, 100),
            html: `<h2>New All In Sports member ⚽</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(memberEmail)}</p><p><strong>Player ID:</strong> ${escapeHtml(String(newPlayer.id))}</p><p>A new member has completed Player ID signup.</p>`,
            text: `New All In Sports member\\nName: ${name}\\nEmail: ${memberEmail}\\nPlayer ID: ${newPlayer.id}`,
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) console.error('New member admin notification failed', response.status);
      }
    } catch (notificationError) {
      console.error('New member admin notification error', notificationError);
    }

    // Record optional email announcement consent only after Player ID creation.
    // If preference storage is not installed, do not infer consent from signup.
    if (emailConsent === true) {
      const { error: preferenceError } = await supabase.from('player_announcement_preferences').upsert({
        user_id: user.id,
        email_opt_in: true,
        email_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (preferenceError) {
        console.error('Email consent preference save failed', preferenceError.code);
        // Player ID exists, but marketing consent was NOT reliably saved.
        // Do not report a fully successful signup or send an opt-in confirmation.
        return Response.json({
          success: false,
          playerId: newPlayer.id,
          signupSaved: true,
          announcementPreferenceSaved: false,
          error: 'Your Player ID was created, but we could not save your email announcement preference. Please open My All In to confirm your preference.',
        }, { status: 503 });
      }
    }

        if (smsConsent) {
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !twilioPhoneNumber) {
          console.error('Missing Twilio environment variables');
        } else {
          const twilioClient = twilio(accountSid, authToken);

          await twilioClient.messages.create({
            body: `Welcome to All In Sports ⚽ You're officially All In! We're building the future of local sports — Player IDs, stats, highlights and more. We'll keep you posted as new features roll out. Reply STOP to opt out.`,
            from: twilioPhoneNumber,
            to: phone,
          });
        }
      } catch (smsError) {
        console.error('Twilio welcome SMS error:', smsError);
      }


    }

    // Send welcome email
  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY');
    } else {
      const firstName = fullName.trim().split(' ')[0].replace(/[<>&"']/g, '');

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
         from: 'All In Sports <welcome@allinsportsnj.com>',
          to: [email],
          subject: `Welcome to All In Sports, ${firstName}! ⚽`,
          html: `
            <h1>You're officially All In! ⚽</h1>
            <p>Hey ${firstName},</p>
            <p>Welcome to All In Sports.</p>
            <p>We're building the future of local sports — bringing together your Player ID, stats, highlights, leagues, events and more.</p>
            <p>Your All In journey starts here.</p>
            <p><strong>We'll keep you posted as new features roll out.</strong></p>
            <p>— All In Sports</p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Resend welcome email error:', await emailResponse.text());
      }
    }
  } catch (emailError) {
    console.error('Welcome email error:', emailError);
  }
    return Response.json({
  success: true,
  playerId: newPlayer.id,
});
  } catch (error) {
    console.error('Signup API error:', error);

    return Response.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
