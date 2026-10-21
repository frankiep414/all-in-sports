import {pickupPaymentConfirmedEmail} from '../../../../lib/notification-email-templates';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function validSignature(payload:string,header:string,secret:string):boolean{
 const parts=header.split(',').map(x=>x.trim().split('='));
 const timestamp=parts.find(p=>p[0]==='t')?.[1];
 const signatures=parts.filter(p=>p[0]==='v1').map(p=>p[1]);
 if(!timestamp||!/^[0-9]+$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
 const digest=createHmac('sha256',secret).update(timestamp+'.'+payload).digest('hex');
 return signatures.some(sig=>{
  if(!/^[0-9a-f]{64}$/i.test(sig))return false;
  return timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(digest,'hex'));
 });
}

async function sendPickupPaymentConfirmation(
 db:any,registrationId:string,amountCents:number
):Promise<void>{
 // Transactional mail is separately enabled; never controlled by marketing opt-in.
 if(process.env.VERCEL_ENV!=='production'||process.env.PICKUP_PAYMENT_CONFIRMATION_EMAIL_ENABLED!=='true')return;
 const resend=process.env.RESEND_API_KEY;
 if(!resend)return;
 const {data:registration,error:regError}=await db.from('pickup_registrations')
  .select('id,user_id,game_id,status,payment_status,payment_reference,spots_reserved')
  .eq('id',registrationId).maybeSingle();
 if(regError||!registration||registration.status!=='confirmed'||registration.payment_status!=='paid')return;
 const {data:event,error:eventError}=await db.from('notification_events')
  .select('id').eq('event_key','payment_verified:'+registration.id).maybeSingle();
 if(eventError||!event)return;
 const {data:game,error:gameError}=await db.from('pickup_games')
  .select('title,venue,starts_at,price_cents,is_test').eq('id',registration.game_id).maybeSingle();
 if(gameError||!game||game.is_test||game.price_cents*(registration.spots_reserved||1)!==amountCents)return;
 const {data:{user},error:userError}=await db.auth.admin.getUserById(registration.user_id);
 if(userError||!user?.email_confirmed_at||!user.email)return;
 const email=user.email.trim().toLowerCase();
 // Unique(event_id,channel,destination) is the durable, at-most-once claim.
 const {data:claim,error:claimError}=await db.from('notification_deliveries').insert({
  event_id:event.id,recipient_user_id:registration.user_id,channel:'email',
  destination:email,status:'sending',provider:'resend',attempts:1
 }).select('id').single();
 if(claimError||!claim)return;
 const template=pickupPaymentConfirmedEmail({
  gameTitle:game.title,venue:game.venue,
  startsAt:new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'full',timeStyle:'short'}),
  amountCents,reference:registration.payment_reference||''
 });
 try{
  const response=await fetch('https://api.resend.com/emails',{
   method:'POST',headers:{Authorization:'Bearer '+resend,'Content-Type':'application/json',
    'Idempotency-Key':'ais-payment-'+claim.id},
   body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[email],
    subject:template.subject,html:template.html,text:template.text}),
   signal:AbortSignal.timeout(12000)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||typeof result.id!=='string'){
   await db.from('notification_deliveries').update({status:'failed',
    error_code:'resend_http_'+response.status,updated_at:new Date().toISOString()}).eq('id',claim.id);
   console.error('Pickup confirmation email rejected',{status:response.status});
   return;
  }
  await db.from('notification_deliveries').update({status:'sent',
   provider_message_id:result.id,updated_at:new Date().toISOString()}).eq('id',claim.id);
 }catch{
  // Delivery may have reached Resend. Keep the claim to prevent duplicate emails.
  console.error('Pickup confirmation email outcome uncertain');
 }
}

export async function POST(request:Request){
 if(!((process.env.VERCEL_ENV==='preview'&&process.env.PICKUP_STRIPE_TEST_ENABLED==='true')||(process.env.VERCEL_ENV==='production'&&process.env.PICKUP_STRIPE_LIVE_ENABLED==='true')))
  return Response.json({error:'Disabled'},{status:503});
 const live=process.env.VERCEL_ENV==='production';
 const secret=live?process.env.PICKUP_STRIPE_LIVE_WEBHOOK_SECRET:process.env.STRIPE_WEBHOOK_SECRET;
 if(!secret?.startsWith('whsec_')){
  // Safe diagnostics: never include the signing secret or request payload.
  const diagnostic={
   error:'Not configured',
   reason:!secret?'webhook_secret_missing':'webhook_secret_invalid_format',
   environment:process.env.VERCEL_ENV||'unknown',
   deployment:process.env.VERCEL_URL||'unknown',
   commit:(process.env.VERCEL_GIT_COMMIT_SHA||'unknown').slice(0,8)
  };
  console.error('Stripe test webhook configuration issue',diagnostic);
  return Response.json(diagnostic,{status:503});
 }
 const raw=await request.text();
 if(raw.length>200000)return Response.json({error:'Too large'},{status:413});
 if(!validSignature(raw,request.headers.get('stripe-signature')||'',secret))
  return Response.json({error:'Invalid signature'},{status:400});
 try{
  const event=JSON.parse(raw);
  if(typeof event.id!=='string'||typeof event.type!=='string'||event.livemode!==live)
   return Response.json({error:'Invalid test event'},{status:400});
  if(event.type!=='checkout.session.completed')return Response.json({received:true});
  const session=event.data?.object;
  if(session?.object!=='checkout.session'||session.mode!=='payment'||session.payment_status!=='paid'||
     typeof session.id!=='string'||typeof session.amount_total!=='number'||session.currency!=='usd')
   return Response.json({received:true});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)return Response.json({error:'Database unavailable'},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:result,error}=await db.rpc(live?'confirm_pickup_stripe_live_payment':'confirm_pickup_stripe_test_payment',{
   p_session_id:session.id,p_payment_intent_id:typeof session.payment_intent==='string'?session.payment_intent:null,
   p_amount_cents:session.amount_total,p_currency:session.currency
  });
  if(error){console.error('Stripe test webhook processing failed',{code:error.code});return Response.json({error:'Retry later'},{status:503});}
  if(live&&(result==='confirmed'||result==='already_processed')){
   const {data:checkout,error:checkoutError}=await db.from('pickup_stripe_checkout_sessions')
    .select('registration_id,status').eq('stripe_checkout_session_id',session.id).maybeSingle();
   if(!checkoutError&&checkout?.status==='completed'&&typeof checkout.registration_id==='string'){
    try{await sendPickupPaymentConfirmation(db,checkout.registration_id,session.amount_total);}
    catch{console.error('Pickup confirmation email processing failed');}
   }
  }
  console.info('Stripe checkout event processed',{result,event_type:event.type});
  return Response.json({received:true});
 }catch{return Response.json({error:'Webhook processing error'},{status:503});}
}
