import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return Response.json({ error: 'Authentication required.' }, { status: 401 });

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url || !publicKey || !secretKey) {
      return Response.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user?.email) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: player, error } = await admin.from('players')
      .select('id, full_name, email')
      .ilike('email', user.email)
      .maybeSingle();

    if (error) {
      console.error('Player lookup failed:', error);
      return Response.json({ error: 'Unable to load player.' }, { status: 500 });
    }
    if (!player) return Response.json({ error: 'Player not found.' }, { status: 404 });
    return Response.json({ id: player.id, full_name: player.full_name });
  } catch (error) {
    console.error('Player API error:', error);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
