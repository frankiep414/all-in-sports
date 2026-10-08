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
