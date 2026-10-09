import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function session(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return null;
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key||!secret)throw Error('CONFIG');
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);
 if(error||!user?.email||!user.email_confirmed_at)return null;
 return {user,db:createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})};
}
export async function POST(request:Request){
 try{
  const access=await session(request);
  if(!access)return Response.json({error:'Please sign in to register.'},{status:401});
  const body=await request.json();
  if(typeof body.game_id!=='string'||!uuid.test(body.game_id))
   return Response.json({error:'Invalid game.'},{status:400});
  const {data:player,error:playerError}=await access.db.from('players')
   .select('id').ilike('email',access.user.email!).maybeSingle();
  if(playerError)return Response.json({error:'Unable to verify Player ID.'},{status:503});
  if(!player)return Response.json({error:'Complete your All In player profile before registering.'},{status:403});
  const {data,error}=await access.db.rpc('request_pickup_registration',{
   p_game_id:body.game_id,p_player_id:String(player.id),p_user_id:access.user.id
  });
  if(error){
   if(error.message.includes('GAME_FULL'))return Response.json({error:'This game is full.'},{status:409});
   if(error.message.includes('GAME_UNAVAILABLE'))return Response.json({error:'This game is no longer open.'},{status:409});
   if(error.message.includes('REGISTRATION_CANCELLED'))return Response.json({error:'Your registration was cancelled. Contact All In Sports.'},{status:409});
   console.error('Registration failed',{code:error.code});
   return Response.json({error:'Unable to register. Please try again.'},{status:503});
  }
  const row=data?.[0];
  return Response.json({registration_id:row?.registration_id,status:row?.registration_status,
   message:'Registration received. Payment has not been collected or confirmed.'});
 }catch{return Response.json({error:'Unable to register.'},{status:503});}
}
export async function GET(request:Request){
 try{
  const access=await session(request);
  if(!access)return Response.json({error:'Sign in required.'},{status:401});
  const {data,error}=await access.db.from('pickup_registrations')
   .select('id,game_id,status,payment_status,created_at')
   .eq('user_id',access.user.id).order('created_at',{ascending:false}).limit(100);
  if(error)return Response.json({error:'Registrations unavailable.'},{status:503});
  return Response.json({registrations:data},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Registrations unavailable.'},{status:503});}
}
