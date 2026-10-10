import {createClient} from '@supabase/supabase-js';
import {registrationEmail} from './notification-email-templates';

// Automated email is deliberately limited to admin-owned test-game registrations.
// A separate rollout is required for real players and notification preferences.
export async function sendAutomatedTestRegistrationEmail(input:{
 registrationId:string;gameId:string;
 userId:string;email:string;playerName:string;status:string;reference:string;
}):Promise<void>{
 if(process.env.PICKUP_AUTO_TEST_EMAIL_ENABLED!=='true')return;
 const key=process.env.RESEND_API_KEY;
 if(!key)return;
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!secret)return;
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:game,error:gameError}=await db.from('pickup_games')
  .select('id,title,venue,starts_at,is_test').eq('id',input.gameId).maybeSingle();
 if(gameError||!game?.is_test)return;
 const {data:admin,error:adminError}=await db.from('admin_users')
  .select('user_id').eq('user_id',input.userId).maybeSingle();
 if(adminError||!admin)return;
 const {data:registration,error:registrationError}=await db.from('pickup_registrations')
  .select('user_id,game_id').eq('id',input.registrationId).maybeSingle();
 if(registrationError||registration?.user_id!==input.userId||registration.game_id!==input.gameId)return;
 const type=input.status==='waitlisted'?'waitlist_joined':'registration_received';
 const eventKey=`${type}:${input.registrationId}`;
 const {data:event,error:eventError}=await db.from('notification_events')
  .select('id').eq('event_key',eventKey).maybeSingle();
 if(eventError||!event)return;
 const {data:claim,error:claimError}=await db.from('notification_deliveries')
  .insert({event_id:event.id,recipient_user_id:input.userId,channel:'email',
   destination:input.email,status:'sending',provider:'resend',attempts:1})
  .select('id').single();
 if(claimError||!claim)return; // Duplicate and ambiguous attempts are never resent.
 const template=registrationEmail({
  playerName:input.playerName,gameTitle:game.title,venue:game.venue,
  startsAt:new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York'}),
  paymentReference:input.reference,
  status:input.status==='waitlisted'?'waitlisted':input.status==='offered'?'offered':'pending_payment'
 });
 try{
  const response=await fetch('https://api.resend.com/emails',{
   method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',
    'Idempotency-Key':`all-in-auto-test-${claim.id}`},
   body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',
    to:[input.email],subject:template.subject,html:template.html,text:template.text}),
   signal:AbortSignal.timeout(12000)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||typeof result.id!=='string'){
   await db.from('notification_deliveries').update({
    status:'failed',error_code:`resend_http_${response.status}`,updated_at:new Date().toISOString()
   }).eq('id',claim.id);
   return;
  }
  await db.from('notification_deliveries').update({
   status:'sent',provider_message_id:result.id,updated_at:new Date().toISOString()
  }).eq('id',claim.id);
 }catch{
  // The request may have reached Resend. Keep the claim to prevent duplicates.
  console.error('Automatic test email outcome uncertain');
 }
}
