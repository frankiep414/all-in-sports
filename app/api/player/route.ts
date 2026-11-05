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
    // Player statistics are fetched server-side only after verifying the authenticated email.
    // The underlying stats table is private and is never exposed through Supabase's public API.
    const { data: sessions, error: statsError } = await admin.from('player_match_stats')
      .select('session_date,street_rating,fixtures_played,goals,assists,saves,tackles,interceptions')
      .eq('player_id', player.id).order('session_date', { ascending: false });
    if (statsError) {
      console.error('Player stats lookup failed:', statsError);
      return Response.json({ error: 'Unable to load player statistics.' }, { status: 503 });
    }
    const history = sessions || [];
    const sum = (key: 'goals'|'assists'|'saves'|'tackles'|'interceptions') =>
      history.reduce((total, row) => total + Number(row[key] || 0), 0);
    return Response.json({
      id: player.id, full_name: player.full_name,
      stats: history.length ? {
        sessions: history.length,
        fixtures_played: history.reduce((total, row) => total + Number(row.fixtures_played || 0), 0),
        goals: sum('goals'), assists: sum('assists'), saves: sum('saves'),
        tackles: sum('tackles'), interceptions: sum('interceptions'),
        latest_street_rating: history[0].street_rating,
        latest_session_date: history[0].session_date,
      } : null,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Player API error:', error);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
 try {
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return Response.json({error:'Sign in required.'},{status:401});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey=process.env.SUPABASE_SECRET_KEY;
  if(!url||!publicKey||!secretKey)return Response.json({error:'Configuration unavailable.'},{status:503});
  const auth=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user?.email)return Response.json({error:'Sign in required.'},{status:401});
  const body=await request.json().catch(()=>null);
  const fullName=typeof body?.full_name==='string'?body.full_name.trim().replace(/\s+/g,' '):'';
  if(fullName.length<3||fullName.length>100||!fullName.includes(' '))
   return Response.json({error:'Enter your first and last name (3–100 characters).'},{status:400});
  if(/[<>\r\n]/.test(fullName))return Response.json({error:'Invalid characters in name.'},{status:400});
  const db=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:player,error:lookupError}=await db.from('players').select('id').ilike('email',user.email).maybeSingle();
  if(lookupError||!player)return Response.json({error:'Player profile unavailable.'},{status:404});
  const {data:updated,error:updateError}=await db.from('players').update({full_name:fullName}).eq('id',player.id).ilike('email',user.email).select('id,full_name').single();
  if(updateError){console.error('Player name update failed:',{code:updateError.code,message:updateError.message});return Response.json({error:'Unable to save name. Please try again or contact All In Sports.'},{status:503});}
  if(!updated)return Response.json({error:'No player record was updated.'},{status:409});
  return Response.json({player:updated},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Unable to update profile.'},{status:503});}
}
