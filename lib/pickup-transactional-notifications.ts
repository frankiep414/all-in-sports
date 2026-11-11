import twilio from 'twilio';

type Kind='registration_received'|'payment_verified'|'payment_reminder'|'registration_cancelled';
type Db=any;
export async function sendPickupTransactional(db:Db,registrationId:string,kind:Kind){
 if(process.env.PICKUP_TRANSACTIONAL_NOTIFICATIONS_ENABLED!=='true')return {disabled:true};
 const {data:r,error}=await db.from('pickup_registrations').select('id,user_id,game_id,status,payment_status,registration_type,team_name,spots_reserved,payment_reference').eq('id',registrationId).maybeSingle();
 if(error||!r||(r.status==='cancelled'&&kind!=='registration_cancelled'))return {skipped:'registration'};
 if(kind==='payment_reminder'&&(r.payment_status==='paid'||r.status==='confirmed'||!['pending_payment','offered'].includes(r.status)))return {skipped:'paid_or_ineligible'};
 if(kind==='registration_received'&&!['pending_payment','offered'].includes(r.status))return {skipped:'not_payment_pending'};
 if(kind==='registration_cancelled'&&r.status!=='cancelled')return {skipped:'not_cancelled'};
 if(kind==='payment_verified'&&(r.payment_status!=='paid'||r.status!=='confirmed'))return {skipped:'not_paid'};
 const {data:g}=await db.from('pickup_games').select('id,title,venue,starts_at,price_cents,is_test').eq('id',r.game_id).maybeSingle();
 if(!g||g.is_test)return {skipped:'game'};
 const now=new Date(),start=new Date(g.starts_at);
 if(kind==='payment_reminder'&&(start<=now||new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(start)!==new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)))return {skipped:'not_game_day'};
 const {data:{user}}=await db.auth.admin.getUserById(r.user_id);
 if(!user?.email_confirmed_at||!user.email)return {skipped:'user'};
 const {data:p}=await db.from('players').select('full_name').ilike('email',user.email).maybeSingle();
 const {data:event,error:eventError}=await db.from('notification_events').upsert({
  event_key:kind+':'+r.id,event_type:kind,game_id:g.id,registration_id:r.id,
  payload:{transactional:true}
 },{onConflict:'event_key',ignoreDuplicates:true}).select('id').maybeSingle();
 if(eventError)return {error:'event'};
 const eventId=event?.id||(await db.from('notification_events').select('id').eq('event_key',kind+':'+r.id).single()).data?.id;
 if(!eventId)return {error:'event_missing'};
 const when=start.toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'full',timeStyle:'short'});
 const amount=' const team=r.registration_type==='team'?'Team: '+(r.team_name||'Unnamed')+' ('+(r.spots_reserved||5)+' players)':'Solo registration';
 const state=kind==='registration_cancelled'?'REGISTRATION CANCELLED':kind==='payment_verified'?'PAYMENT CONFIRMED':kind==='payment_reminder'?'PAYMENT REMINDER':'REGISTRATION RECEIVED — PAYMENT PENDING';
 const details=[state,g.title,team,when,g.venue,'Amount: '+amount,'Reference: '+(r.payment_reference||'Not assigned')].join('\n');
 const message='Hi '+(p?.full_name||'player')+',\n'+details+'\n'+(kind==='registration_cancelled'?'Your registration has been cancelled. This confirmation does not indicate a refund. Contact All In Sports if you have a payment question.':kind==='payment_verified'?'You are confirmed.':kind==='payment_reminder'?'Our records still show payment pending. If you have already paid via Zelle, contact All In Sports to verify it.':'Registration received, but your spot is not confirmed as paid.')+'\nView: https://allinsportsnj.com/my-all-in';
 const allowedEmail=(process.env.PICKUP_TRANSACTIONAL_EMAIL_ALLOWLIST||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 const allowedSms=(process.env.PICKUP_TRANSACTIONAL_SMS_ALLOWLIST||'').split(',').map(x=>x.trim()).filter(Boolean);
 const preview=process.env.VERCEL_ENV!=='production';
 const results:{email?:string;sms?:string}={};
 const email=user.email.toLowerCase();
 if(process.env.PICKUP_TRANSACTIONAL_EMAIL_ENABLED==='true'&&process.env.RESEND_API_KEY&&(!preview||allowedEmail.includes(email))&&(!allowedEmail.length||allowedEmail.includes(email))){
  const {data:claim}=await db.from('notification_deliveries').upsert({event_id:eventId,recipient_user_id:r.user_id,channel:'email',destination:email,status:'sending',provider:'resend',attempts:1},{onConflict:'event_id,channel,destination',ignoreDuplicates:true}).select('id').maybeSingle();
  if(claim){
   try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'ais-transactional-'+claim.id},body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[email],subject:'All In Sports — '+state,html:'<div style="white-space:pre-line;font-family:Arial,sans-serif">'+message.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]||c))+'</div>',text:message}),signal:AbortSignal.timeout(12000)});
    const payload=await response.json().catch(()=>({}));
    await db.from('notification_deliveries').update({status:response.ok&&payload.id?'sent':'failed',provider_message_id:payload.id||null,error_code:response.ok?null:'resend_http_'+response.status,updated_at:new Date().toISOString()}).eq('id',claim.id);
    results.email=response.ok&&payload.id?'sent':'failed';
   }catch{results.email='uncertain';}
  }
 }
 if(process.env.PICKUP_TRANSACTIONAL_SMS_ENABLED==='true'&&process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_PHONE_NUMBER){
  const {data:pref}=await db.from('notification_preferences').select('phone_e164,sms_opted_in,sms_transactional,sms_opted_out_at').eq('user_id',r.user_id).maybeSingle();
  const number=pref?.phone_e164;
  if(number?.startsWith('+')&&pref.sms_opted_in&&pref.sms_transactional&&!pref.sms_opted_out_at&&(!preview||allowedSms.includes(number))&&(!allowedSms.length||allowedSms.includes(number))){
   const {data:claim}=await db.from('notification_deliveries').upsert({event_id:eventId,recipient_user_id:r.user_id,channel:'sms',destination:number,status:'sending',provider:'twilio',attempts:1},{onConflict:'event_id,channel,destination',ignoreDuplicates:true}).select('id').maybeSingle();
   if(claim){
    try{const response=await twilio(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN).messages.create({from:process.env.TWILIO_PHONE_NUMBER,to:number,body:message+' Reply STOP to opt out.'});
     await db.from('notification_deliveries').update({status:'sent',provider_message_id:response.sid,updated_at:new Date().toISOString()}).eq('id',claim.id);results.sms='sent';
    }catch{results.sms='uncertain';}
   }
  }
 }
 return results;
}
+((r.spots_reserved||1)*(g.price_cents||1600)/100).toFixed(2);
 const team=r.registration_type==='team'?'Team: '+(r.team_name||'Unnamed')+' ('+(r.spots_reserved||5)+' players)':'Solo registration';
 const state=kind==='registration_cancelled'?'REGISTRATION CANCELLED':kind==='payment_verified'?'PAYMENT CONFIRMED':kind==='payment_reminder'?'PAYMENT REMINDER':'REGISTRATION RECEIVED — PAYMENT PENDING';
 const details=[state,g.title,team,when,g.venue,'Amount: '+amount,'Reference: '+(r.payment_reference||'Not assigned')].join('\n');
 const message='Hi '+(p?.full_name||'player')+',\n'+details+'\n'+(kind==='registration_cancelled'?'Your registration has been cancelled. This confirmation does not indicate a refund. Contact All In Sports if you have a payment question.':kind==='payment_verified'?'You are confirmed.':kind==='payment_reminder'?'Our records still show payment pending. If you have already paid via Zelle, contact All In Sports to verify it.':'Registration received, but your spot is not confirmed as paid.')+'\nView: https://allinsportsnj.com/my-all-in';
 const allowedEmail=(process.env.PICKUP_TRANSACTIONAL_EMAIL_ALLOWLIST||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 const allowedSms=(process.env.PICKUP_TRANSACTIONAL_SMS_ALLOWLIST||'').split(',').map(x=>x.trim()).filter(Boolean);
 const preview=process.env.VERCEL_ENV!=='production';
 const results:{email?:string;sms?:string}={};
 const email=user.email.toLowerCase();
 if(process.env.PICKUP_TRANSACTIONAL_EMAIL_ENABLED==='true'&&process.env.RESEND_API_KEY&&(!preview||allowedEmail.includes(email))&&(!allowedEmail.length||allowedEmail.includes(email))){
  const {data:claim}=await db.from('notification_deliveries').upsert({event_id:eventId,recipient_user_id:r.user_id,channel:'email',destination:email,status:'sending',provider:'resend',attempts:1},{onConflict:'event_id,channel,destination',ignoreDuplicates:true}).select('id').maybeSingle();
  if(claim){
   try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'ais-transactional-'+claim.id},body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[email],subject:'All In Sports — '+state,html:'<div style="white-space:pre-line;font-family:Arial,sans-serif">'+message.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]||c))+'</div>',text:message}),signal:AbortSignal.timeout(12000)});
    const payload=await response.json().catch(()=>({}));
    await db.from('notification_deliveries').update({status:response.ok&&payload.id?'sent':'failed',provider_message_id:payload.id||null,error_code:response.ok?null:'resend_http_'+response.status,updated_at:new Date().toISOString()}).eq('id',claim.id);
    results.email=response.ok&&payload.id?'sent':'failed';
   }catch{results.email='uncertain';}
  }
 }
 if(process.env.PICKUP_TRANSACTIONAL_SMS_ENABLED==='true'&&process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_PHONE_NUMBER){
  const {data:pref}=await db.from('notification_preferences').select('phone_e164,sms_opted_in,sms_transactional,sms_opted_out_at').eq('user_id',r.user_id).maybeSingle();
  const number=pref?.phone_e164;
  if(number?.startsWith('+')&&pref.sms_opted_in&&pref.sms_transactional&&!pref.sms_opted_out_at&&(!preview||allowedSms.includes(number))&&(!allowedSms.length||allowedSms.includes(number))){
   const {data:claim}=await db.from('notification_deliveries').upsert({event_id:eventId,recipient_user_id:r.user_id,channel:'sms',destination:number,status:'sending',provider:'twilio',attempts:1},{onConflict:'event_id,channel,destination',ignoreDuplicates:true}).select('id').maybeSingle();
   if(claim){
    try{const response=await twilio(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN).messages.create({from:process.env.TWILIO_PHONE_NUMBER,to:number,body:message+' Reply STOP to opt out.'});
     await db.from('notification_deliveries').update({status:'sent',provider_message_id:response.sid,updated_at:new Date().toISOString()}).eq('id',claim.id);results.sms='sent';
    }catch{results.sms='uncertain';}
   }
  }
 }
 return results;
}
+((r.spots_reserved||1)*(g.price_cents||1600)/100).toFixed(2);
 const team=r.registration_type==='team'?'Team: '+(r.team_name||'Unnamed')+' ('+(r.spots_reserved||5)+' players)':'Solo registration';
 const state=kind==='registration_cancelled'?'REGISTRATION CANCELLED':kind==='payment_verified'?'PAYMENT CONFIRMED':kind==='payment_reminder'?'PAYMENT REMINDER':'REGISTRATION RECEIVED — PAYMENT PENDING';
 const details=[state,g.title,team,when,g.venue,'Amount: '+amount,'Reference: '+(r.payment_reference||'Not assigned')].join('\n');
 const message='Hi '+(p?.full_name||'player')+',\n'+details+'\n'+(kind==='registration_cancelled'?'Your registration has been cancelled. This confirmation does not indicate a refund. Contact All In Sports if you have a payment question.':kind==='payment_verified'?'You are confirmed.':kind==='payment_reminder'?'Our records still show payment pending. If you have already paid via Zelle, contact All In Sports to verify it.':'Registration received, but your spot is not confirmed as paid.')+'\nView: https://allinsportsnj.com/my-all-in';
 const allowedEmail=(process.env.PICKUP_TRANSACTIONAL_EMAIL_ALLOWLIST||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 const allowedSms=(process.env.PICKUP_TRANSACTIONAL_SMS_ALLOWLIST||'').split(',').map(x=>x.trim()).filter(Boolean);
 const preview=process.env.VERCEL_ENV!=='production';
 const results:{email?:string;sms?:string}={};
 const email=user.email.toLowerCase();
 if(process.env.PICKUP_TRANSACTIONAL_EMAIL_ENABLED==='true'&&process.env.RESEND_API_KEY&&(!preview||allowedEmail.includes(email))&&(!allowedEmail.length||allowedEmail.includes(email))){
  const {data:claim}=await db.from('notification_deliveries').upsert({event_id:eventId,recipient_user_id:r.user_id,channel:'email',destination:email,status:'sending',provider:'resend',attempts:1},{onConflict:'event_id,channel,destination',ignoreDuplicates:true}).select('id').maybeSingle();
  if(claim){
   try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'ais-transactional-'+claim.id},body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[email],subject:'All In Sports — '+state,html:'<div style="white-space:pre-line;font-family:Arial,sans-serif">'+message.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]||c))+'</div>',text:message}),signal:AbortSignal.timeout(12000)});
    const payload=await response.json().catch(()=>({}));
    await db.from('notification_deliveries').update({status:response.ok&&payload.id?'sent':'failed',provider_message_id:payload.id||null,error_code:response.ok?null:'resend_http_'+response.status,updated_at:new Date().toISOString()}).eq('id',claim.id);
    results.email=response.ok&&payload.id?'sent':'failed';
   }catch{results.email='uncertain';}
  }
 }
 if(process.env.PICKUP_TRANSACTIONAL_SMS_ENABLED==='true'&&process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_PHONE_NUMBER){
  const {data:pref}=await db.from('notification_preferences').select('phone_e164,sms_opted_in,sms_transactional,sms_opted_out_at').eq('user_id',r.user_id).maybeSingle();
  const number=pref?.phone_e164;
  if(number?.startsWith('+')&&pref.sms_opted_in&&pref.sms_transactional&&!pref.sms_opted_out_at&&(!preview||allowedSms.includes(number))&&(!allowedSms.length||allowedSms.includes(number))){
   const {data:claim}=await db.from('notification_deliveries').upsert({event_id:eventId,recipient_user_id:r.user_id,channel:'sms',destination:number,status:'sending',provider:'twilio',attempts:1},{onConflict:'event_id,channel,destination',ignoreDuplicates:true}).select('id').maybeSingle();
   if(claim){
    try{const response=await twilio(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN).messages.create({from:process.env.TWILIO_PHONE_NUMBER,to:number,body:message+' Reply STOP to opt out.'});
     await db.from('notification_deliveries').update({status:'sent',provider_message_id:response.sid,updated_at:new Date().toISOString()}).eq('id',claim.id);results.sms='sent';
    }catch{results.sms='uncertain';}
   }
  }
 }
 return results;
}
+((r.spots_reserved||1)*(g.price_cents||1600)/100).toFixed(2);
 const team=r.registration_type==='team'?'Team: '+(r.team_name||'Unnamed')+' ('+(r.spots_reserved||5)+' players)':'Solo registration';
 const state=kind==='registration_cancelled'?'REGISTRATION CANCELLED':kind==='payment_verified'?'PAYMENT CONFIRMED':kind==='payment_reminder'?'PAYMENT REMINDER':'REGISTRATION RECEIVED — PAYMENT PENDING';
 const details=[state,g.title,team,when,g.venue,'Amount: '+amount,'Reference: '+(r.payment_reference||'Not assigned')].join('\n');
 const message='Hi '+(p?.full_name||'player')+',\n'+details+'\n'+(kind==='registration_cancelled'?'Your registration has been cancelled. This confirmation does not indicate a refund. Contact All In Sports if you have a payment question.':kind==='payment_verified'?'You are confirmed.':kind==='payment_reminder'?'Our records still show payment pending. If you have already paid via Zelle, contact All In Sports to verify it.':'Registration received, but your spot is not confirmed as paid.')+'\nView: https://allinsportsnj.com/my-all-in';
 const allowedEmail=(process.env.PICKUP_TRANSACTIONAL_EMAIL_ALLOWLIST||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 const allowedSms=(process.env.PICKUP_TRANSACTIONAL_SMS_ALLOWLIST||'').split(',').map(x=>x.trim()).filter(Boolean);
 const preview=process.env.VERCEL_ENV!=='production';
 const results:{email?:string;sms?:string}={};
 const email=user.email.toLowerCase();
 if(process.env.PICKUP_TRANSACTIONAL_EMAIL_ENABLED==='true'&&process.env.RESEND_API_KEY&&(!preview||allowedEmail.includes(email))&&(!allowedEmail.length||allowedEmail.includes(email))){
  const {data:claim}=await db.from('notification_deliveries').upsert({event_id:eventId,recipient_user_id:r.user_id,channel:'email',destination:email,status:'sending',provider:'resend',attempts:1},{onConflict:'event_id,channel,destination',ignoreDuplicates:true}).select('id').maybeSingle();
  if(claim){
   try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'ais-transactional-'+claim.id},body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[email],subject:'All In Sports — '+state,html:'<div style="white-space:pre-line;font-family:Arial,sans-serif">'+message.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]||c))+'</div>',text:message}),signal:AbortSignal.timeout(12000)});
    const payload=await response.json().catch(()=>({}));
    await db.from('notification_deliveries').update({status:response.ok&&payload.id?'sent':'failed',provider_message_id:payload.id||null,error_code:response.ok?null:'resend_http_'+response.status,updated_at:new Date().toISOString()}).eq('id',claim.id);
    results.email=response.ok&&payload.id?'sent':'failed';
   }catch{results.email='uncertain';}
  }
 }
 if(process.env.PICKUP_TRANSACTIONAL_SMS_ENABLED==='true'&&process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_PHONE_NUMBER){
  const {data:pref}=await db.from('notification_preferences').select('phone_e164,sms_opted_in,sms_transactional,sms_opted_out_at').eq('user_id',r.user_id).maybeSingle();
  const number=pref?.phone_e164;
  if(number?.startsWith('+')&&pref.sms_opted_in&&pref.sms_transactional&&!pref.sms_opted_out_at&&(!preview||allowedSms.includes(number))&&(!allowedSms.length||allowedSms.includes(number))){
   const {data:claim}=await db.from('notification_deliveries').upsert({event_id:eventId,recipient_user_id:r.user_id,channel:'sms',destination:number,status:'sending',provider:'twilio',attempts:1},{onConflict:'event_id,channel,destination',ignoreDuplicates:true}).select('id').maybeSingle();
   if(claim){
    try{const response=await twilio(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN).messages.create({from:process.env.TWILIO_PHONE_NUMBER,to:number,body:message+' Reply STOP to opt out.'});
     await db.from('notification_deliveries').update({status:'sent',provider_message_id:response.sid,updated_at:new Date().toISOString()}).eq('id',claim.id);results.sms='sent';
    }catch{results.sms='uncertain';}
   }
  }
 }
 return results;
}
