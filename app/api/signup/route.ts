import { createClient } from '@supabase/supabase-js';

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

    return Response.json({ success: true });
  } catch (error) {
    console.error('Signup API error:', error);

    return Response.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
