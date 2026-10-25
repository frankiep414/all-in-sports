import {createClient} from '@supabase/supabase-js';
import twilio from 'twilio';
import {gamePublishedEmail} from '../../../../lib/notification-email-templates';
import {unsubscribeToken} from '../../../../lib/announcement-unsubscribe';
export const dynamic='force-dynamic';

// Called by a scheduler with Authorization: Bearer <CRON_SECRET>.
// Email and SMS are separately gated and disabled by default.
export async function GET(request:Request){
 const cronSecret=process.env.CRON_SECRET;
 if(!cronSecret||request.headers.get('authorization')!=='Bearer '+cronSecret)
  return Response.json({error:'Unauthorized'},{status:401});
 const emailEnabled=process.env.GAME_PUBLISHED_AUTO_EMAIL_ENABLED==='true';
 const smsEnabled=process.env.GAME_PUBLISHED_AUTO_SMS_ENABLED==='true';
 if(!emailEnabled&&!smsEnabled)return Response.json({enabled:false,sent:0});
 const site=(process.env.NEXT_PUBLIC_SITE_URL||'').replace(/[/]$/,'');
 const activation=process.env.GAME_ALERTS_NOT_BEFORE;
 if(!activation||!Number.isFinite(Date.parse(activation))||!site.startsWith('https://')||
   (process.env.VERCEL_ENV==='production'&&site!=='https://allinsportsnj.com'))
  return Response.json({error:'Activation time or site URL not configured'},{status:503});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY,resend=process.env.RESEND_API_KEY;
 if(!url||!secret||(emailEnabled&&(!resend||!process.env.ANNOUNCEMENT_UNSUBSCRIBE_SECRET||process.env.ANNOUNCEMENT_UNSUBSCRIBE_SECRET.length<32))||(smsEnabled&&(!process.env.TWILIO_ACCOUNT_SID||!process.env.TWILIO_AUTH_TOKEN||!process.env.TWILIO_PHONE_NUMBER)))
  return Response.json({error:'Provider configuration incomplete'},{status:503});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:events,error:eventError}=await db.from('notification_events')
  .select('id,game_id,created_at').eq('event_type','game_published')
  .gte('created_at',new Date(activation).toISOString())
  .order('created_at',{ascending:false}).limit(20);
 if(eventError)return Response.json({error:'Unable to load publication events'},{status:503});
 const allow=(process.env.GAME_ALERTS_EMAIL_ALLOWLIST||'').split(',')
  .map(x=>x.trim().toLowerCase()).filter(Boolean);
 // Require an allowlist in Preview; never accidentally blast real users from staging.
 if(process.env.VERCEL_ENV!=='production'&&emailEnabled&&!allow.length)
  return Response.json({error:'Preview allowlist required'},{status:503});
 const smsAllow=(process.env.GAME_ALERTS_SMS_ALLOWLIST||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(process.env.VERCEL_ENV!=='production'&&smsEnabled&&!smsAllow.length)return Response.json({error:'Preview SMS allowlist required'},{status:503});
 let sent=0,skipped=0,failed=0,smsSent=0,smsFailed=0;
 for(const event of events||[]){
  if(!event.game_id)continue;
  const {data:game,error:gameError}=await db.from('pickup_games')
   .select('id,title,venue,starts_at,status,is_test').eq('id',event.game_id).maybeSingle();
  if(gameError||!game||game.status!=='published'||new Date(game.starts_at)<=new Date()||
     (process.env.VERCEL_ENV==='production'&&game.is_test))continue;
  // Bound the work per run; repeat scheduled invocations pick up unsent recipients.
  if(emailEnabled){
  const {data:prefs,error:prefError}=await db.from('player_announcement_preferences')
   .select('user_id').eq('email_opt_in',true).order('user_id').limit(1000);
  if(prefError)return Response.json({error:'Unable to read member preferences'},{status:503});
  for(const pref of prefs||[]){
   if(sent+failed>=15)break;
   const {data:{user},error:userError}=await db.auth.admin.getUserById(pref.user_id);
   if(userError||!user?.email_confirmed_at||!user.email){skipped++;continue;}
   const email=user.email.toLowerCase();
   if((process.env.VERCEL_ENV!=='production'||allow.length)&&!allow.includes(email)){skipped++;continue;}
   const {data:player,error:playerError}=await db.from('players').select('id').ilike('email',email).limit(1);
   if(playerError){failed++;continue;}
   if(!player?.length){skipped++;continue;}
   const {data:existing,error:existingError}=await db.from('notification_deliveries')
    .select('id').eq('event_id',event.id).eq('channel','email').eq('destination',email).limit(1);
   if(existingError){failed++;continue;}
   if(existing?.length)continue;
   const {data:current,error:consentError}=await db.from('player_announcement_preferences')
    .select('email_opt_in').eq('user_id',pref.user_id).maybeSingle();
   if(consentError||current?.email_opt_in!==true){skipped++;continue;}
   const {data:claim,error:claimError}=await db.from('notification_deliveries').insert({
    event_id:event.id,recipient_user_id:pref.user_id,channel:'email',
    destination:email,status:'sending',provider:'resend',attempts:1
   }).select('id').single();
   if(claimError){if(claimError.code!=='23505')failed++;continue;}
   const template=gamePublishedEmail({title:game.title,venue:game.venue,
    startsAt:new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'full',timeStyle:'short'})});
   const register=site+'/play?game='+encodeURIComponent(game.id);
   const unsub=site+'/unsubscribe?token='+encodeURIComponent(unsubscribeToken(pref.user_id));
   const oneClick=site+'/api/announcements/one-click?token='+encodeURIComponent(unsubscribeToken(pref.user_id));
   const html=template.html.replace('</main>','<p><a href="'+register+'">REGISTER NOW</a></p><p><a href="'+unsub+'">Unsubscribe</a></p></main>');
   try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{
     Authorization:'Bearer '+resend,'Content-Type':'application/json','Idempotency-Key':'all-in-auto-game-'+claim.id
    },body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[email],
     subject:template.subject,html,text:template.text+'\\nRegister: '+register+'\\nUnsubscribe: '+unsub,
     headers:{'List-Unsubscribe':'<'+oneClick+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}),
     signal:AbortSignal.timeout(10000)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||typeof result.id!=='string'){
     failed++;
     await db.from('notification_deliveries').update({status:'failed',error_code:'resend_http_'+response.status,updated_at:new Date().toISOString()}).eq('id',claim.id);
    }else{
     sent++;
     await db.from('notification_deliveries').update({status:'sent',provider_message_id:result.id,updated_at:new Date().toISOString()}).eq('id',claim.id);
    }
   }catch{
    failed++;
    // Keep 'sending' to avoid duplicate mail on an uncertain provider outcome.
    console.error('Automatic email outcome uncertain',claim.id);
   }
  }
  }
  if(smsEnabled){
   const {data:subscribers,error:subError}=await db.from('notification_preferences')
    .select('user_id,phone_e164').eq('sms_opted_in',true).eq('sms_game_alerts',true)
    .is('sms_opted_out_at',null).order('user_id').limit(1000);
   if(subError)return Response.json({error:'SMS consent lookup failed'},{status:503});
   const client=twilio(process.env.TWILIO_ACCOUNT_SID!,process.env.TWILIO_AUTH_TOKEN!);
   for(const subscriber of subscribers||[]){
    if(smsSent+smsFailed>=10)break;
    const number=subscriber.phone_e164;
    if(!number||!number.startsWith('+'))continue;
    if((process.env.VERCEL_ENV!=='production'||smsAllow.length)&&!smsAllow.includes(number))continue;
    const {data:channel,error:channelError}=await db.from('player_announcement_preferences')
     .select('sms_opt_in').eq('user_id',subscriber.user_id).maybeSingle();
    if(channelError||channel?.sms_opt_in!==true)continue;
    const {data:current,error:currentError}=await db.from('notification_preferences')
     .select('sms_opted_in,sms_game_alerts,sms_opted_out_at').eq('user_id',subscriber.user_id).maybeSingle();
    if(currentError||!current?.sms_opted_in||!current.sms_game_alerts||current.sms_opted_out_at)continue;
    const {data:claim,error:claimError}=await db.from('notification_deliveries').insert({
     event_id:event.id,recipient_user_id:subscriber.user_id,channel:'sms',
     destination:number,status:'sending',provider:'twilio',attempts:1
    }).select('id').single();
    if(claimError){if(claimError.code!=='23505')smsFailed++;continue;}
    const when=new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'short',timeStyle:'short'});
    try{
     const {data:{user:recipientUser},error:recipientError}=await db.auth.admin.getUserById(subscriber.user_id);
     if(recipientError||!recipientUser?.email_confirmed_at)continue;
     const {data:player}=await db.from('players').select('id').ilike('email',recipientUser.email||'').limit(1);
     if(!player?.length)continue;
     const result=await client.messages.create({
      to:number,from:process.env.TWILIO_PHONE_NUMBER!,
      body:'All In Sports: New game! '+game.title+' | '+when+' | '+game.venue+
       '. Sign up: '+site+'/play?game='+encodeURIComponent(game.id)+' Reply STOP to opt out.'
     });
     await db.from('notification_deliveries').update({status:'sent',provider_message_id:result.sid,
      updated_at:new Date().toISOString()}).eq('id',claim.id);
     smsSent++;
    }catch(error){
     smsFailed++;
     console.error('Twilio game alert outcome uncertain',claim.id,error);
    }
   }
  }
  if(sent+failed>=15||smsSent+smsFailed>=10)break;
 }
 return Response.json({enabled:true,sent,skipped,failed,smsSent,smsFailed,events_checked:events?.length||0});
}
