import {createClient} from '@supabase/supabase-js';
import {gamePublishedEmail} from '@/lib/notification-email-templates';
export const dynamic='force-dynamic';
// Preview-only admin self-test. Never broadcasts to players.
export async function POST(request:Request){
 if(process.env.VERCEL_ENV!=='preview')return Response.json({error:'Preview only.'},{status:403});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 const resend=process.env.RESEND_API_KEY;
 if(!url||!key||!secret||!resend)return Response.json({error:'Preview email configuration missing.'},{status:503});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return Response.json({error:'Sign in required.'},{status:401});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.email||!user.email_confirmed_at)return Response.json({error:'Sign in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:role,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError||!role)return Response.json({error:'Admin only.'},{status:403});
 const body=await request.json().catch(()=>({}));
 const id=typeof body.game_id==='string'?body.game_id:'';
 if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'Invalid game.'},{status:400});
 const {data:game,error:gameError}=await db.from('pickup_games').select('id,title,venue,starts_at,status').eq('id',id).maybeSingle();
 if(gameError||!game||game.status!=='published'||new Date(game.starts_at)<=new Date())return Response.json({error:'Choose an upcoming published game.'},{status:409});
 const eventKey='game_published:'+id;
 const {data:event,error:eventError}=await db.from('notification_events').select('id').eq('event_key',eventKey).maybeSingle();
 if(eventError||!event)return Response.json({error:'Game publication event missing.'},{status:409});
 // One admin test email per game and admin account; claim before sending to prevent repeats.
 const {data:claim,error:claimError}=await db.from('notification_deliveries').insert({
  event_id:event.id,recipient_user_id:user.id,channel:'email',destination:user.email,
  status:'sending',provider:'resend',attempts:1
 }).select('id').single();
 if(claimError||!claim)return Response.json({error:'This announcement has already been tested for this admin, or a delivery record exists.'},{status:409});
 const template=gamePublishedEmail({title:game.title,venue:game.venue,startsAt:new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'full',timeStyle:'short'})});
 const site=new URL(request.url).origin;
 const link=site+'/play?game='+encodeURIComponent(id);
 const html=template.html.replace('</main>','<p style="margin:24px 0"><a href="'+link+'" style="display:inline-block;background:#a9dbff;color:#07111d;padding:14px 22px;border-radius:9px;font-weight:bold;text-decoration:none">REGISTER NOW →</a></p></main>');
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resend,'Content-Type':'application/json','Idempotency-Key':'all-in-game-announcement-test-'+claim.id},body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[user.email],subject:'[PREVIEW TEST] '+template.subject,html,text:template.text+'\n\nRegister: '+link}),signal:AbortSignal.timeout(12000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||typeof result.id!=='string'){
   await db.from('notification_deliveries').update({status:'failed',error_code:'resend_http_'+response.status,updated_at:new Date().toISOString()}).eq('id',claim.id);
   return Response.json({error:'Email provider rejected the test. Check Resend logs.'},{status:502});
  }
  await db.from('notification_deliveries').update({status:'sent',provider_message_id:result.id,updated_at:new Date().toISOString()}).eq('id',claim.id);
  return Response.json({sent:true,to:user.email});
 }catch{
  console.error('Announcement test email delivery outcome uncertain');
  return Response.json({error:'Delivery outcome uncertain. Check Resend before retrying.'},{status:502});
 }
}
