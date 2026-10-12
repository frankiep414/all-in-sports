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
export async function POST(request:Request){
 if(process.env.VERCEL_ENV!=='preview'||process.env.PICKUP_STRIPE_TEST_ENABLED!=='true')
  return Response.json({error:'Disabled'},{status:503});
 const secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!secret?.startsWith('whsec_'))return Response.json({error:'Not configured'},{status:503});
 const raw=await request.text();
 if(raw.length>200000)return Response.json({error:'Too large'},{status:413});
 if(!validSignature(raw,request.headers.get('stripe-signature')||'',secret))
  return Response.json({error:'Invalid signature'},{status:400});
 try{
  const event=JSON.parse(raw);
  if(typeof event.id!=='string'||typeof event.type!=='string'||event.livemode!==false)
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
  const {data:result,error}=await db.rpc('confirm_pickup_stripe_test_payment',{
   p_session_id:session.id,p_payment_intent_id:typeof session.payment_intent==='string'?session.payment_intent:null,
   p_amount_cents:session.amount_total,p_currency:session.currency
  });
  if(error){console.error('Stripe test webhook processing failed',{code:error.code});return Response.json({error:'Retry later'},{status:503});}
  console.info('Stripe test checkout event processed',{result,event_type:event.type});
  return Response.json({received:true});
 }catch{return Response.json({error:'Webhook processing error'},{status:503});}
}
