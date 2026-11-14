import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return Response.json({error:'Sign in required.'},{status:401});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!pub||!secret)return Response.json({error:'Upload not configured.'},{status:503});
  const auth=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user?.email)return Response.json({error:'Unauthorized.'},{status:401});
  const adminEmail=process.env.AIR_CARD_ADMIN_EMAIL||'allinsports.imom@gmail.com';
  if(user.email.toLowerCase()!==adminEmail.toLowerCase())return Response.json({error:'Admin access required.'},{status:403});
  try{
    const form=await request.formData();
    const file=form.get('card');
    const playerId=Number(form.get('player_id'));
    const date=String(form.get('session_date')||'');
    if(!(file instanceof File)||file.type!=='image/png'||file.size>5_000_000||file.size<100||!Number.isSafeInteger(playerId)||playerId<1||!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:'Provide a PNG under 5 MB, valid player ID and date.'},{status:400});
    const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:session,error:sessionError}=await db.from('player_air_sessions').select('player_id').eq('player_id',playerId).eq('session_date',date).maybeSingle();
    if(sessionError)throw sessionError;
    if(!session)return Response.json({error:'No AIR session matches this player and date.'},{status:404});
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(bytes.slice(0,8).some((b,i)=>b!==[137,80,78,71,13,10,26,10][i]))return Response.json({error:'Invalid PNG.'},{status:400});
    const bucket='air-player-cards';
    const path=`${date}/${playerId}.png`;
    const {error:uploadError}=await db.storage.from(bucket).upload(path,bytes,{contentType:'image/png',upsert:true,cacheControl:'3600'});
    if(uploadError)throw uploadError;
    const {data}=db.storage.from(bucket).getPublicUrl(path);
    const {error:linkError}=await db.from('player_air_card_assets').upsert({player_id:playerId,session_date:date,card_url:data.publicUrl},{onConflict:'player_id,session_date'});
    if(linkError)throw linkError;
    return Response.json({ok:true,card_url:data.publicUrl});
  }catch(e){console.error('AIR card upload failed',e);return Response.json({error:'Card upload failed. Check storage setup.'},{status:503});}
}


export async function GET(request: Request) {
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return Response.json({error:'Sign in required.'},{status:401});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!pub||!secret)return Response.json({error:'Unavailable.'},{status:503});
  const auth=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await auth.auth.getUser(token);
  if(error||!user?.email)return Response.json({error:'Unauthorized.'},{status:401});
  if(user.email.toLowerCase()!==(process.env.AIR_CARD_ADMIN_EMAIL||'allinsports.imom@gmail.com').toLowerCase())return Response.json({error:'Admin access required.'},{status:403});
  const date=new URL(request.url).searchParams.get('date')||'2026-11-11';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:'Invalid date.'},{status:400});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error:dbError}=await db.from('player_air_sessions').select('player_id,players(full_name)').eq('session_date',date);
  if(dbError)return Response.json({error:'Unable to load roster.'},{status:503});
  return Response.json({players:(data||[]).map((row:any)=>({id:row.player_id,name:Array.isArray(row.players)?row.players[0]?.full_name:row.players?.full_name})).filter((p:any)=>p.name)},{headers:{'Cache-Control':'private, no-store'}});
}
