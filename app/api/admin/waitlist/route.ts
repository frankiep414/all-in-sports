import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
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
  if(roleError)return Response.json({error:'Access check unavailable.'},{status:503});
  if(!role)return Response.json({error:'Administrator access required.'},{status:403});
  const body=await request.json();
  if(body.action!=='reconcile'||typeof body.game_id!=='string'||!uuid.test(body.game_id))
   return Response.json({error:'Invalid request.'},{status:400});
  const {data,error:rpcError}=await db.rpc('reconcile_pickup_waitlist',{p_game_id:body.game_id});
  if(rpcError){console.error('Waitlist reconciliation failed',{code:rpcError.code});
   return Response.json({error:'Unable to process waitlist. Check SQL migration.'},{status:503});}
  return Response.json({result:data?.[0]||{expired_count:0,offered_count:0},
   note:'No messages were sent. Waitlist offers require notification integration.'});
 }catch{return Response.json({error:'Unable to process waitlist.'},{status:503});}
}
