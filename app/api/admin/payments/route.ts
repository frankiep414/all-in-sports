import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return Response.json({error:'Sign in required.'},{status:401});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key||!secret)return Response.json({error:'Configuration unavailable.'},{status:503});
  const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await auth.auth.getUser(token);
  if(error||!user?.email_confirmed_at)return Response.json({error:'Unauthorized.'},{status:401});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:role,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(roleError)return Response.json({error:'Unable to verify access.'},{status:503});
  if(!role)return Response.json({error:'Admin only.'},{status:403});
  const body=await request.json();
  if(body.action!=='verify_zelle'||typeof body.registration_id!=='string'||!uuid.test(body.registration_id))
   return Response.json({error:'Invalid request.'},{status:400});
  const {data,error:rpcError}=await db.rpc('verify_pickup_zelle',{
   p_registration_id:body.registration_id,p_admin_user_id:user.id
  });
  if(rpcError){console.error('Zelle verification failed',{code:rpcError.code});
   return Response.json({error:'Unable to confirm payment. Check eligibility and SQL setup.'},{status:409});}
  if(data==='confirmed'){
   const {data:registration}=await db.from('pickup_registrations')
    .select('game_id').eq('id',body.registration_id).maybeSingle();
   if(registration){
    const {error:eventError}=await db.from('notification_events').upsert({
     event_key:`payment_verified:${body.registration_id}`,event_type:'payment_verified',
     game_id:registration.game_id,registration_id:body.registration_id,
     payload:{source:'admin_bank_verification'}
    },{onConflict:'event_key',ignoreDuplicates:true});
    if(eventError)console.error('Payment verified event failed',{code:eventError.code});
   }
  }
  return Response.json({status:data});
 }catch{return Response.json({error:'Unable to verify payment.'},{status:503});}
}
