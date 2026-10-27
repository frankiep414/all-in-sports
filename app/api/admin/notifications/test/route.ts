import {createClient} from '@supabase/supabase-js';
import twilio from 'twilio';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!token||!url||!pub||!secret)return Response.json({error:'Authentication unavailable'},{status:401});
  const auth=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await auth.auth.getUser(token);
  if(error||!user?.email_confirmed_at||!user.email)return Response.json({error:'Sign in required'},{status:401});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:admin,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(roleError||!admin)return Response.json({error:'Admin access required'},{status:403});
  const email=user.email.toLowerCase();
  const allowed=(process.env.GAME_ALERTS_EMAIL_ALLOWLIST||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  const smsAllowed=(process.env.GAME_ALERTS_SMS_ALLOWLIST||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!allowed.length||!allowed.includes(email)||!smsAllowed.length)
   return Response.json({error:'Test recipient allowlists are required'},{status:403});
  const {data:pref,error:prefError}=await db.from('player_announcement_preferences').select('email_opt_in,sms_opt_in').eq('user_id',user.id).maybeSingle();
  if(prefError||!pref)return Response.json({error:'Notification preferences unavailable'},{status:409});
  const {data:player,error:playerError}=await db.from('players').select('id').ilike('email',email).limit(1);
  if(playerError||!player?.length)return Response.json({error:'Player ID required'},{status:409});
  const {data:phone,error:phoneError}=await db.from('notification_preferences').select('phone_e164,sms_opted_in,sms_game_alerts,sms_opted_out_at').eq('user_id',user.id).maybeSingle();
  if(phoneError)return Response.json({error:'SMS preferences unavailable'},{status:503});
  const results:{email:string;sms:string;details:string[]}={email:'skipped',sms:'skipped',details:[]};
  if(pref.email_opt_in===true){
   if(!process.env.RESEND_API_KEY){results.email='configuration_missing';results.details.push('RESEND_API_KEY missing');}
   else{
    try{
     const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({
      from:'All In Sports <noreply@allinsportsnj.com>',to:[email],
      subject:'All In Sports — Notification Test',
      text:'TEST ONLY: Your All In Sports game announcement email notifications are working. No game was published and no registration was created.',
      html:'<p><strong>TEST ONLY</strong></p><p>Your All In Sports game announcement email notifications are working.</p><p>No game was published and no registration was created.</p>'
     }),signal:AbortSignal.timeout(10000)});
     const data=await response.json().catch(()=>({}));
     results.email=response.ok&&typeof data.id==='string'?'accepted':'failed';
     if(results.email==='failed')results.details.push('Resend HTTP '+response.status);
    }catch{results.email='failed';results.details.push('Resend request failed');}
   }
  }else results.details.push('Email opt-in disabled');
  if(pref.sms_opt_in===true&&phone?.sms_opted_in&&phone.sms_game_alerts&&!phone.sms_opted_out_at&&phone.phone_e164&&smsAllowed.includes(phone.phone_e164)){
   if(!process.env.TWILIO_ACCOUNT_SID||!process.env.TWILIO_AUTH_TOKEN||!process.env.TWILIO_PHONE_NUMBER){
    results.sms='configuration_missing';results.details.push('Twilio configuration missing');
   }else{
    try{
     await twilio(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN).messages.create({
      from:process.env.TWILIO_PHONE_NUMBER,to:phone.phone_e164,
      body:'All In Sports TEST ONLY: Your game announcement SMS notifications are working. No game was published. Reply STOP to opt out.'
     });
     results.sms='accepted';
    }catch{results.sms='failed';results.details.push('Twilio request failed');}
   }
  }else results.details.push('SMS consent or test allowlist unavailable');
  return Response.json({test_only:true,...results},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Unable to run notification test'},{status:500});}
}
