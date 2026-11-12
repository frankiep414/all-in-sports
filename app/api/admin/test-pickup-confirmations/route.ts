import {createClient} from '@supabase/supabase-js';
import twilio from 'twilio';
export const dynamic='force-dynamic';

// Isolated, read-only test. Never creates notification events or changes registrations.
const permitted=new Set([
 'e9706241-5c1c-44cb-a4cd-f5f35bd4e491',
 '254f998f-ac27-4580-b222-da6c2a08df47'
]);
export async function POST(request:Request){
 if(process.env.VERCEL_ENV!=='preview')return Response.json({error:'Preview only'},{status:404});
 const secret=process.env.PICKUP_TEST_SECRET;
 if(!secret||request.headers.get('authorization')!=='Bearer '+secret)return Response.json({error:'Unauthorized'},{status:401});
 if(process.env.PICKUP_TEST_SEND_ENABLED!=='true')return Response.json({disabled:true});
 const body=await request.json().catch(()=>null);
 if(!body||!permitted.has(body.registration_id)||!['email','sms'].includes(body.channel))return Response.json({error:'Unsupported test'},{status:400});
 const url=process.env.PICKUP_TEST_SUPABASE_URL,key=process.env.PICKUP_TEST_SUPABASE_SECRET_KEY;
 if(!url||!key||!url.startsWith('https://hwhmhtdpbjgovgroyndw.supabase.co'))return Response.json({error:'Approved live test database configuration required'},{status:503});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:r,error}=await db.from('pickup_registrations').select('id,user_id,game_id,team_name,spots_reserved,registration_type,status,payment_status').eq('id',body.registration_id).maybeSingle();
 if(error||!r||r.status!=='pending_payment'||r.payment_status!=='unpaid'||r.registration_type!=='team'||r.spots_reserved!==5)return Response.json({error:'Registration is not eligible'},{status:409});
 const {data:g}=await db.from('pickup_games').select('title,starts_at,price_cents').eq('id',r.game_id).maybeSingle();
 if(!g)return Response.json({error:'Game unavailable'},{status:409});
 const {data:{user}}=await db.auth.admin.getUserById(r.user_id);
 const email=user?.email?.toLowerCase();
 const allowedEmail=process.env.PICKUP_TEST_EMAIL?.trim().toLowerCase();
 const allowedPhone=process.env.PICKUP_TEST_PHONE?.trim();
 if(!email||!allowedEmail||email!==allowedEmail)return Response.json({error:'Test email recipient not configured'},{status:403});
 const {data:pref}=await db.from('notification_preferences').select('phone_e164,sms_opted_in,sms_transactional,sms_opted_out_at').eq('user_id',r.user_id).maybeSingle();
 if(body.channel==='sms'&&(!allowedPhone||pref?.phone_e164!==allowedPhone||!pref.sms_opted_in||!pref.sms_transactional||pref.sms_opted_out_at))return Response.json({error:'SMS consent or recipient mismatch'},{status:403});
 const amount=((r.spots_reserved||1)*(g.price_cents??1600)/100).toFixed(2);
 const message=['TEST ONLY — All In Sports registration confirmation',r.team_name+' — '+g.title,'5 players — $'+amount+' pending','This is a notification delivery test. Your registration and payment have not changed.'].join(String.fromCharCode(10));
 if(body.channel==='email'){
  if(!process.env.RESEND_API_KEY)return Response.json({error:'Email provider unavailable'},{status:503});
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[email],subject:'TEST ONLY — All In Sports — '+r.team_name,text:message})});
  return Response.json({channel:'email',accepted:response.ok},{status:response.ok?200:502});
 }
 if(!process.env.TWILIO_ACCOUNT_SID||!process.env.TWILIO_AUTH_TOKEN||!process.env.TWILIO_PHONE_NUMBER)return Response.json({error:'SMS provider unavailable'},{status:503});
 try{
  const sent=await twilio(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN).messages.create({from:process.env.TWILIO_PHONE_NUMBER,to:allowedPhone,body:message+' Reply STOP to opt out.'});
  return Response.json({channel:'sms',accepted:!!sent.sid});
 }catch{return Response.json({error:'SMS provider rejected test'},{status:502});}
}
