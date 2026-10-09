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
  if(roleError)return Response.json({error:'Unable to verify admin access.'},{status:503});
  if(!role)return Response.json({error:'Admin only.'},{status:403});
  const {data:events,error:eventsError}=await db.from('notification_events')
   .select('id,event_type,event_key,game_id,created_at').order('created_at',{ascending:false}).limit(50);
  if(eventsError)return Response.json({error:'Notification database not installed yet.'},{status:503});
  const {data:deliveries,error:deliveriesError}=await db.from('notification_deliveries')
   .select('id,event_id,channel,status,provider,created_at').order('created_at',{ascending:false}).limit(100);
  if(deliveriesError)return Response.json({error:'Notification delivery history unavailable.'},{status:503});
  return Response.json({events,deliveries,delivery_enabled:false},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Notification history unavailable.'},{status:503});}
}
