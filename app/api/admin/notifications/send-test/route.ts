import {createClient} from '@supabase/supabase-js';
import {registrationEmail} from '../../../../../lib/notification-email-templates';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return Response.json({error:'Sign in required.'},{status:401});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret=process.env.SUPABASE_SECRET_KEY;
  const resendKey=process.env.RESEND_API_KEY;
  if(!url||!publicKey||!secret||!resendKey)
   return Response.json({error:'Email testing is not configured.'},{status:503});
  const auth=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user?.email_confirmed_at||!user.email)return Response.json({error:'Unauthorized.'},{status:401});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:admin,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(roleError)return Response.json({error:'Access check unavailable.'},{status:503});
  if(!admin)return Response.json({error:'Admin only.'},{status:403});
  const body=await request.json();
  if(typeof body?.registration_id!=='string'||!uuid.test(body.registration_id))
   return Response.json({error:'Invalid registration.'},{status:400});
  if(body?.confirm!==true)return Response.json({error:'Explicit confirmation required.'},{status:400});
  const {data:registration,error:registrationError}=await db.from('pickup_registrations')
   .select('id,game_id,player_id,user_id,status,payment_reference').eq('id',body.registration_id).maybeSingle();
  if(registrationError||!registration)return Response.json({error:'Registration unavailable.'},{status:404});
  // Admin can only send a test for their own registration. Destination is never client-supplied.
  if(registration.user_id!==user.id)return Response.json({error:'Only your own test registration can be emailed.'},{status:403});
  const {data:game,error:gameError}=await db.from('pickup_games')
   .select('title,venue,starts_at,is_test').eq('id',registration.game_id).maybeSingle();
  if(gameError||!game)return Response.json({error:'Game unavailable.'},{status:404});
  if(!game.is_test)return Response.json({error:'Test-only games required.'},{status:403});
  const {data:player,error:playerError}=await db.from('players')
   .select('full_name').eq('id',registration.player_id).maybeSingle();
  if(playerError)return Response.json({error:'Player unavailable.'},{status:503});
  const status=registration.status==='waitlisted'?'waitlisted':
   registration.status==='offered'?'offered':'pending_payment';
  const template=registrationEmail({
   playerName:player?.full_name||'Player',gameTitle:game.title,
   venue:game.venue,startsAt:new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York'}),
   paymentReference:registration.payment_reference||'Pending',status
  });
  const eventKey=`admin_email_test:${registration.id}:${user.id}`;
  const {data:event,error:eventError}=await db.from('notification_events').upsert({
   event_key:eventKey,event_type:'admin_reminder',game_id:registration.game_id,
   registration_id:registration.id,payload:{source:'admin_registration_email_test'}
  },{onConflict:'event_key',ignoreDuplicates:true}).select('id').maybeSingle();
  if(eventError)return Response.json({error:'Could not record email test.'},{status:503});
  let eventId=event?.id as string|undefined;
  if(!eventId){
   const {data:existing,error:lookupError}=await db.from('notification_events').select('id').eq('event_key',eventKey).single();
   if(lookupError||!existing)return Response.json({error:'Email test record unavailable.'},{status:503});
   eventId=existing.id;
  }
  // Unique (event_id, channel, destination) acts as an atomic, one-time send claim.
  // We intentionally do not retry ambiguous failures: a timeout may still have sent email.
  const {data:delivery,error:claimError}=await db.from('notification_deliveries').insert({
   event_id:eventId,recipient_user_id:user.id,channel:'email',destination:user.email,
   status:'sending',provider:'resend',attempts:1
  }).select('id').single();
  if(claimError){
   if(claimError.code==='23505')return Response.json({error:'A test email was already attempted for this registration. No duplicate was sent.'},{status:409});
   return Response.json({error:'Could not safely reserve test email.'},{status:503});
  }
  const response=await fetch('https://api.resend.com/emails',{
   method:'POST',headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json',
    'Idempotency-Key':`all-in-test-${delivery.id}`},
   body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[user.email],
    subject:template.subject,html:template.html,text:template.text}),
   signal:AbortSignal.timeout(12000)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||typeof result.id!=='string'){
   await db.from('notification_deliveries').update({
    status:'failed',error_code:`resend_http_${response.status}`,updated_at:new Date().toISOString()
   }).eq('id',delivery.id);
   return Response.json({error:'Resend did not confirm acceptance. Check Resend logs before any retry.'},{status:502});
  }
  const {error:saveError}=await db.from('notification_deliveries').update({
   status:'sent',provider_message_id:result.id,updated_at:new Date().toISOString()
  }).eq('id',delivery.id);
  return Response.json({accepted:true,recipient:user.email,recorded:!saveError},
   {headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({error:'Email status uncertain. Check Resend logs before retrying.'},{status:503});
 }
}
