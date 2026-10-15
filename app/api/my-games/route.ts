import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return Response.json({error:'Sign in required'},{status:401});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!pub||!secret)return Response.json({error:'Configuration unavailable'},{status:503});
  const auth=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user?.email_confirmed_at)return Response.json({error:'Unauthorized'},{status:401});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:regs,error:regError}=await db.from('pickup_registrations').select('game_id').eq('user_id',user.id).limit(100);
  if(regError)return Response.json({error:'Unable to load games'},{status:503});
  const ids=[...new Set((regs||[]).map(r=>r.game_id))];
  if(!ids.length)return Response.json({games:[]});
  const {data:games,error:gameError}=await db.from('pickup_games')
   .select('id,title,venue,starts_at').in('id',ids).order('starts_at',{ascending:true});
  if(gameError)return Response.json({error:'Unable to load games'},{status:503});
  return Response.json({games:games||[]},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Unable to load games'},{status:503});}
}
