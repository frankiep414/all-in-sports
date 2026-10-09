import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return Response.json({error:'Sign in required.'},{status:401});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key||!secret)return Response.json({error:'Configuration unavailable.'},{status:503});
  const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await auth.auth.getUser(token);
  if(error||!user?.email_confirmed_at)return Response.json({error:'Unauthorized.'},{status:401});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:role,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(roleError)return Response.json({error:'Unable to verify access.'},{status:503});
  if(!role)return Response.json({error:'Admin only.'},{status:403});
  const gameId=new URL(request.url).searchParams.get('game_id');
  if(!gameId||!/^[0-9a-f-]{36}$/i.test(gameId))return Response.json({error:'Invalid game.'},{status:400});
  const {data,error:lookupError}=await db.from('pickup_registrations')
    .select('id,user_id,player_id,status,payment_status,created_at')
    .eq('game_id',gameId).order('created_at',{ascending:true}).limit(100);
  if(lookupError)return Response.json({error:'Unable to load roster.'},{status:503});
  const playerIds=[...new Set((data||[]).map(r=>r.player_id))];
  let names:Record<string,string>={};
  if(playerIds.length){
   const {data:players,error:playerError}=await db.from('players').select('id,full_name').in('id',playerIds);
   if(playerError)return Response.json({error:'Unable to load roster.'},{status:503});
   names=Object.fromEntries((players||[]).map(p=>[p.id,p.full_name]));
  }
  return Response.json({registrations:(data||[]).map(r=>({
    id:r.id,player_name:names[r.player_id]||'Player',status:r.status,
    payment_status:r.payment_status,created_at:r.created_at
  }))},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Unable to load roster.'},{status:503});}
}
