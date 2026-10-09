import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
 if(process.env.PICKUP_ZELLE_REPORTING_ENABLED!=='true')
  return Response.json({error:'Zelle payment reporting is not enabled yet.'},{status:403});
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return Response.json({error:'Sign in required.'},{status:401});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key||!secret)return Response.json({error:'Configuration unavailable.'},{status:503});
  const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user?.email_confirmed_at)return Response.json({error:'Sign in required.'},{status:401});
  const body=await request.json();
  if(!body||!uuid.test(body.registration_id)||body.confirm_sent!==true)
   return Response.json({error:'Please confirm you sent the Zelle payment.'},{status:400});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:registration,error:lookupError}=await db.from('pickup_registrations')
   .select('id,status,payment_status').eq('id',body.registration_id).eq('user_id',user.id).maybeSingle();
  if(lookupError)return Response.json({error:'Registration unavailable.'},{status:503});
  if(!registration)return Response.json({error:'Registration not found.'},{status:404});
  if(registration.payment_status==='pending_verification')
   return Response.json({payment_status:'pending_verification'});
  if(registration.payment_status==='paid')
   return Response.json({payment_status:'paid'});
  if(!['pending_payment','offered'].includes(registration.status))
   return Response.json({error:'This registration cannot submit payment.'},{status:409});
  const {data,error}=await db.rpc('submit_pickup_payment',{p_registration_id:registration.id,p_user_id:user.id});
  if(error){console.error('Zelle submission failed',{code:error.code});
   return Response.json({error:'Payment reporting unavailable or payment window closed.'},{status:409});}
  return Response.json({payment_status:data},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Unable to report payment.'},{status:503});}
}
