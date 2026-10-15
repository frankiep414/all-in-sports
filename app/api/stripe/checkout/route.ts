import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Environment-isolated checkout. Production requires explicit enablement and live Stripe credentials.
export async function POST(request:Request){
 try{
  if(!((process.env.VERCEL_ENV==='preview'&&process.env.PICKUP_STRIPE_TEST_ENABLED==='true')||(process.env.VERCEL_ENV==='production'&&process.env.PICKUP_STRIPE_LIVE_ENABLED==='true')))
   return Response.json({error:'Stripe test checkout is not enabled.'},{status:503});
  const stripeKey=process.env.STRIPE_SECRET_KEY;
  const live=process.env.VERCEL_ENV==='production';
  if(!stripeKey?.startsWith(live?'sk_live_':'sk_test_'))
   return Response.json({error:'Stripe test credentials are not configured.'},{status:503});
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return Response.json({error:'Sign in required.'},{status:401});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!publishable||!secret)return Response.json({error:'Configuration unavailable.'},{status:503});
  const auth=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user?.email||!user.email_confirmed_at)
   return Response.json({error:'Sign in required.'},{status:401});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  if(!live){
   const {data:admin,error:adminError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
   if(adminError||!admin)return Response.json({error:'Test checkout is admin-only.'},{status:403});
  }
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.registration_id!=='string'||!uuid.test(body.registration_id))
   return Response.json({error:'Invalid registration.'},{status:400});
  const {data:registration,error:regError}=await db.from('pickup_registrations')
   .select('id,user_id,game_id,status,payment_status,payment_reference')
   .eq('id',body.registration_id).eq('user_id',user.id).maybeSingle();
  if(regError||!registration)return Response.json({error:'Registration unavailable.'},{status:404});
  if(!['pending_payment','offered'].includes(registration.status)||registration.payment_status!=='unpaid')
   return Response.json({error:'Registration is not eligible for checkout.'},{status:409});
  const {data:game,error:gameError}=await db.from('pickup_games')
   .select('id,title,starts_at,status,price_cents,is_test').eq('id',registration.game_id).maybeSingle();
  if(gameError||!game||game.is_test===live||game.status!=='published'||new Date(game.starts_at)<=new Date())
   return Response.json({error:'Test game unavailable.'},{status:409});
  if(!Number.isSafeInteger(game.price_cents)||game.price_cents<50||game.price_cents>100000)
   return Response.json({error:'Test game price must be between $0.50 and $1,000.'},{status:409});
  const {data:prior,error:priorError}=await db.from('pickup_stripe_checkout_sessions')
   .select('stripe_checkout_session_id,status').eq('registration_id',registration.id)
   .eq('status','open').order('created_at',{ascending:false}).limit(1);
  if(priorError)return Response.json({error:'Checkout history unavailable.'},{status:503});
  if(prior?.length){
   // Never create a second checkout when a tracked session exists.
   // Retrieve its current state directly from Stripe before offering a redirect.
   const existingId=prior[0].stripe_checkout_session_id;
   if(typeof existingId!=='string'||!(live?/^cs_live_[A-Za-z0-9_]+$/:/^cs_test_[A-Za-z0-9_]+$/).test(existingId))
    return Response.json({error:'Existing test checkout could not be verified. Contact an admin.'},{status:409});
   const existingResponse=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(existingId),{
    headers:{Authorization:'Bearer '+stripeKey},signal:AbortSignal.timeout(12000),cache:'no-store'
   });
   const existing=await existingResponse.json().catch(()=>null);
   if(!existingResponse.ok||!existing)
    return Response.json({error:'Unable to verify your existing checkout. Please try again later.'},{status:503});
   const belongsToRegistration=existing.id===existingId&&existing.object==='checkout.session'&&
    existing.livemode===live&&existing.mode==='payment'&&
    existing.client_reference_id===registration.id&&
    existing.metadata?.registration_id===registration.id&&
    existing.metadata?.game_id===game.id&&
    existing.currency==='usd'&&existing.amount_total===game.price_cents;
   if(!belongsToRegistration)
    return Response.json({error:'Existing checkout details do not match this registration. Contact an admin.'},{status:409});
   if(existing.status==='open'&&existing.payment_status==='unpaid'&&
      typeof existing.expires_at==='number'&&existing.expires_at>Math.floor(Date.now()/1000)&&
      typeof existing.url==='string'&&existing.url.startsWith('https://checkout.stripe.com/'))
    return Response.json({checkout_url:existing.url,reused:true},{headers:{'Cache-Control':'no-store'}});
   return Response.json({error:existing.status==='complete'?
    'Stripe shows this checkout as completed. Payment confirmation may still be processing; check My All In shortly.':
    'This test checkout has expired or is no longer available. Contact an admin to reset the test checkout safely.'},{status:409});
  }
  const host=process.env.VERCEL_URL;
  const origin=live?'https://allinsportsnj.com':(host&&/^[a-z0-9.-]+\.vercel\.app$/i.test(host)?'https://'+host:'');
  if(!origin)return Response.json({error:'Checkout return URL unavailable.'},{status:503});
  const form=new URLSearchParams({
   mode:'payment',success_url:origin+'/payment/confirmation?registration_id='+encodeURIComponent(registration.id),cancel_url:origin+'/play?stripe=cancel',
   customer_email:user.email,'client_reference_id':registration.id,
   'metadata[registration_id]':registration.id,'metadata[game_id]':game.id,
   'metadata[payment_reference]':registration.payment_reference,
   'line_items[0][price_data][currency]':'usd',
   'line_items[0][price_data][unit_amount]':String(game.price_cents),
   'line_items[0][price_data][product_data][name]':game.title,
   'line_items[0][quantity]':'1',
   'payment_method_types[0]':'card',
   'expires_at':String(Math.floor(Date.now()/1000)+1800)
  });
  const stripeResponse=await fetch('https://api.stripe.com/v1/checkout/sessions',{
   method:'POST',headers:{Authorization:'Bearer '+stripeKey,'Content-Type':'application/x-www-form-urlencoded',
    'Idempotency-Key':(live?'ais-live-checkout-':'ais-preview-checkout-')+registration.id},
   body:form.toString(),signal:AbortSignal.timeout(12000)
  });
  const checkout=await stripeResponse.json().catch(()=>null);
  if(!stripeResponse.ok||typeof checkout?.id!=='string'||typeof checkout?.url!=='string'){
   console.error('Stripe test checkout creation failed',{status:stripeResponse.status});
   return Response.json({error:'Unable to start test checkout.'},{status:503});
  }
  const {error:saveError}=await db.from('pickup_stripe_checkout_sessions').insert({
   registration_id:registration.id,stripe_checkout_session_id:checkout.id,
   amount_cents:game.price_cents,currency:'usd',status:'open'
  });
  if(saveError){
   await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(checkout.id)+'/expire',{
    method:'POST',headers:{Authorization:'Bearer '+stripeKey},
    signal:AbortSignal.timeout(5000)
   }).catch(()=>{});
   console.error('Stripe checkout tracking failed',{code:saveError.code});
   return Response.json({error:'Unable to save test checkout.'},{status:503});
  }
  return Response.json({checkout_url:checkout.url},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({error:'Unable to start test checkout.'},{status:503});
 }
}
