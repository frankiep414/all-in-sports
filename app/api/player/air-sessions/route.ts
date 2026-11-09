import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return Response.json({ error: 'Sign in required.' }, { status: 401 });
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publicKey || !secretKey) return Response.json({ error: 'Unavailable.' }, { status: 503 });
  try {
    const auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError || !user?.email) return Response.json({ error: 'Sign in required.' }, { status: 401 });
    const db = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: player, error: playerError } = await db.from('players').select('id').ilike('email', user.email).maybeSingle();
    if (playerError || !player) return Response.json({ error: 'Player not found.' }, { status: 404 });
    const { data, error } = await db.from('player_air_sessions')
      .select('session_date,air_rating,rating_status,source_label,fixtures_played')
      .eq('player_id', player.id).order('session_date', { ascending: false });
    if (error) throw error;
    const sessions = data || [];
    const verified = sessions.filter(row => row.rating_status === 'confirmed' && Number.isFinite(Number(row.air_rating)));
    const weighted = verified.length > 0 && verified.every(row => Number.isInteger(row.fixtures_played) && row.fixtures_played > 0);
    const totalWeight = verified.reduce((sum,row) => sum + (weighted ? row.fixtures_played : 1), 0);
    const overall = totalWeight ? verified.reduce((sum,row) => sum + Number(row.air_rating) * (weighted ? row.fixtures_played : 1), 0) / totalWeight : null;
    return Response.json({ sessions, overall_air: overall === null ? null : Math.round(overall * 100) / 100, overall_status: overall === null ? 'unrated' : weighted && verified.length >= 2 ? 'established' : 'provisional', rating_sessions: verified.length, games_played: verified.reduce((sum,row) => sum + (Number.isInteger(row.fixtures_played) && row.fixtures_played > 0 ? row.fixtures_played : 0), 0), games_complete: verified.every(row => Number.isInteger(row.fixtures_played) && row.fixtures_played > 0), weighting: weighted ? 'games' : 'sessions' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('AIR session lookup failed', error);
    return Response.json({ error: 'Unable to load AIR ratings.' }, { status: 503 });
  }
}
