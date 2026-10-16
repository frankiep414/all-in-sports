import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const fail=(error:string,status:number)=>NextResponse.json({error},{status});
export async function POST(req:NextRequest){
 if(!['preview','production'].includes(process.env.VERCEL_ENV||'')||process.env.CARMITA_CHECKOUT_ENABLED!=='true')return fail('Donations are not enabled yet.',503);
 const live=process.env.VERCEL_ENV==='production';
 const key=process.env.CARMITA_STRIPE_SECRET_KEY||(!live?process.env.STRIPE_SECRET_KEY:undefined);
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY;
 const site=process.env.NEXT_PUBLIC_SITE_URL;
 if(!(live?/^(sk_live_|rk_live_)/.test(key||''):/^(sk_test_|rk_test_)/.test(key||''))||!url||!secret||!site||!/^https:\/\//.test(site)||live&&!['allinsportsnj.com','www.allinsportsnj.com'].includes(new URL(site).hostname))return fail('Donation checkout is not configured.',503);
 const body=await req.json().catch(()=>null);
 const name=typeof body?.name==='string'?body.name.trim().slice(0,120):'';
 const email=typeof body?.email==='string'?body.email.trim().toLowerCase().slice(0,254):'';
 const amount=body?.amountCents;
 if(name.length<2||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||!Number.isInteger(amount)||amount<100||amount>1000000)return fail('Enter a name, valid email and donation between $1 and $10,000.',400);
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const id=randomUUID();
 const {error}=await db.from('carmita_donations').insert({id,donor_name:name,donor_email:email,amount_cents:amount,payment_status:'pending',stripe_livemode:live});
 if(error){console.error('Donation record failed',error.code);return fail('Unable to start donation.',503);}
 try{
  const params=new URLSearchParams({mode:'payment',success_url:`${site.replace(/\/$/,'')}/play-for-carmita/donation-thank-you?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${site.replace(/\/$/,'')}/play-for-carmita?donation=cancelled#donate`,customer_email:email,
   'line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':String(amount),
   'line_items[0][price_data][product_data][name]':'Play for Carmita — Support Donation',
   'line_items[0][quantity]':'1','metadata[donation_id]':id,'payment_intent_data[metadata][donation_id]':id});
  const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':`carmita-donation-${id}`},body:params.toString(),cache:'no-store'});
  const data=await r.json();
  if(!r.ok||typeof data.id!=='string'||typeof data.url!=='string'||!data.url.startsWith('https://checkout.stripe.com/'))throw Error('Stripe session creation failed');
  const {data:linked,error:linkError}=await db.from('carmita_donations').update({stripe_checkout_session_id:data.id}).eq('id',id).eq('payment_status','pending').select('id').maybeSingle();
  if(linkError||!linked){
   await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(data.id)}/expire`,{method:'POST',headers:{Authorization:`Bearer ${key}`}}).catch(()=>null);
   return fail('Unable to link donation checkout.',503);
  }
  return NextResponse.json({checkoutUrl:data.url});
 }catch(e){console.error('Donation checkout error',e);return fail('Unable to open donation checkout.',503);}
}
