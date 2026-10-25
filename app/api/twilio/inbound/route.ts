import {createClient} from '@supabase/supabase-js';
import twilio from 'twilio';

// Configure this URL as the incoming-message webhook for the approved Twilio sender.
// Fail closed unless Twilio's request signature is valid.
export async function POST(request:Request){
 const authToken=process.env.TWILIO_AUTH_TOKEN;
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!authToken||!url||!secret)return new Response('Unavailable',{status:503});
 const raw=await request.text();
 const params=new URLSearchParams(raw);
 const values:Record<string,string>={};
 params.forEach((value,key)=>{values[key]=value;});
 const signature=request.headers.get('x-twilio-signature')||'';
 const publicWebhookUrl=process.env.TWILIO_INBOUND_WEBHOOK_URL;
 if(!publicWebhookUrl||!publicWebhookUrl.startsWith('https://')||
    !twilio.validateRequest(authToken,signature,publicWebhookUrl,values))
  return new Response('Forbidden',{status:403});
 const message=(values.Body||'').trim().toUpperCase();
 const number=(values.From||'').trim();
 const stop=/^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)$/.test(message);
 const start=/^(START|UNSTOP)$/.test(message);
 // START is not treated as marketing opt-in: it merely removes Twilio's carrier block.
 // A new explicit marketing consent must still be collected via the member account.
 if(!stop&&!start)return new Response('<Response/>',{headers:{'Content-Type':'text/xml'}});
 if(!/^\\+[1-9][0-9]{7,14}$/.test(number))
  return new Response('Invalid number',{status:400});
 if(stop){
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:preferences,error}=await db.from('notification_preferences')
   .update({sms_opted_in:false,sms_game_alerts:false,sms_transactional:false,
    sms_opted_out_at:new Date().toISOString(),updated_at:new Date().toISOString()})
   .eq('phone_e164',number).select('user_id');
  if(error)return new Response('Unable to record opt-out',{status:503});
  for(const preference of preferences||[]){
   const {error:channelError}=await db.from('player_announcement_preferences')
    .update({sms_opt_in:false,sms_updated_at:new Date().toISOString(),
      updated_at:new Date().toISOString()}).eq('user_id',preference.user_id);
   if(channelError)return new Response('Unable to record opt-out',{status:503});
  }
 }
 return new Response('<Response/>',{headers:{'Content-Type':'text/xml'}});
}
