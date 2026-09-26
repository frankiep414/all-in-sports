import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export async function POST(request: Request) {
  try {
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

    if (!fullName || !phone || !email) {
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

    const { error } = await supabase.from('players').insert({
      full_name: fullName,
      phone,
      email,
      played_before: Boolean(playedBefore),
      team_name: playedBefore ? teamName || null : null,
      divisions:
        playedBefore && Array.isArray(divisions) ? divisions : null,
      sms_consent: Boolean(smsConsent),
      sms_consent_at: smsConsent ? new Date().toISOString() : null,
      consent_source: 'player_signup_popup',
    });

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

    return Response.json({ success: true });
    return Response.json({ success: true });
  } catch (error) {
    console.error('Signup API error:', error);

    return Response.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
