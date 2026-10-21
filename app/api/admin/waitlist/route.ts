import {waitlistOfferEmail} from '../../../../lib/notification-email-templates';
import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return Response.json({error:'Sign in required.'},{status:401});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key||!secret)return Response.json({error:'Configuration unavailable.'},{status:503});
  const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await auth.auth.getUser(token);
  if(error||!user?.email_confirmed_at)return Response.json({error:'Unauthorized.'},{status:401});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:role,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(roleError)return Response.json({error:'Access check unavailable.'},{status:503});
  if(!role)return Response.json({error:'Administrator access required.'},{status:403});
  const body=await request.json();
  if(body.action!=='reconcile'||typeof body.game_id!=='string'||!uuid.test(body.game_id))
   return Response.json({error:'Invalid request.'},{status:400});
  // Snapshot offers before reconciliation. Only newly offered registrations receive email.
  const {data:before,error:beforeError}=await db.from('pickup_registrations')
   .select('id').eq('game_id',body.game_id).eq('status','offered');
  if(beforeError)return Response.json({error:'Unable to inspect existing offers.'},{status:503});
  const previous=new Set((before||[]).map(r=>r.id));
  const {data,error:rpcError}=await db.rpc('reconcile_pickup_waitlist',{p_game_id:body.game_id});
  if(rpcError){console.error('Waitlist reconciliation failed',{code:rpcError.code});
   return Response.json({error:'Unable to process waitlist. Check SQL migration.'},{status:503});}
  const result=data?.[0]||{expired_count:0,offered_count:0};
  if(!result.offered_count)return Response.json({result,emails_sent:0});
  const {data:offers,error:offersError}=await db.from('pickup_registrations')
   .select('id,game_id,player_id,user_id,payment_reference,offer_expires_at,status')
   .eq('game_id',body.game_id).eq('status','offered');
  if(offersError)return Response.json({result,emails_sent:0,note:'Offers created, but email lookup failed. Contact players manually.'});
  const newlyOffered=(offers||[]).filter(r=>!previous.has(r.id));
  const {data:game}=await db.from('pickup_games').select('title,venue,starts_at').eq('id',body.game_id).maybeSingle();
  const keyResend=process.env.RESEND_API_KEY;
  let sent=0;
  for(const offer of newlyOffered){
   if(!keyResend||!game||!offer.offer_expires_at)continue;
   const {data:authUser,error:authError}=await db.auth.admin.getUserById(offer.user_id);
   if(authError||!authUser?.user?.email)continue;
   const {data:player}=await db.from('players').select('full_name').eq('id',offer.player_id).maybeSingle();
   const eventKey='waitlist_offer:'+offer.id+':'+offer.offer_expires_at;
   const {data:events,error:eventError}=await db.from('notification_events').upsert({
    event_key:eventKey,event_type:'waitlist_offer',game_id:body.game_id,
    registration_id:offer.id,payload:{offer_expires_at:offer.offer_expires_at}
   },{onConflict:'event_key',ignoreDuplicates:true}).select('id');
   if(eventError)continue;
   let eventId=events?.[0]?.id;
   if(!eventId){
    const {data:existing}=await db.from('notification_events').select('id').eq('event_key',eventKey).maybeSingle();
    eventId=existing?.id;
   }
   if(!eventId)continue;
   // Atomic unique delivery claim prevents duplicate sends on repeated admin clicks.
   const {data:claim,error:claimError}=await db.from('notification_deliveries').insert({
    event_id:eventId,recipient_user_id:offer.user_id,channel:'email',
    destination:authUser.user.email,status:'sending',provider:'resend',attempts:1
   }).select('id').maybeSingle();
   if(claimError||!claim)continue;
   const format=(value:string)=>new Date(value).toLocaleString('en-US',{
    timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'
   })+' ET';
   const template=waitlistOfferEmail({
    playerName:player?.full_name||'Player',gameTitle:game.title,venue:game.venue,
    startsAt:format(game.starts_at),paymentReference:offer.payment_reference||'Pending',
    expiresAt:format(offer.offer_expires_at)
   });
   try{
    const response=await fetch('https://api.resend.com/emails',{
     method:'POST',headers:{Authorization:'Bearer '+keyResend,'Content-Type':'application/json',
      'Idempotency-Key':'all-in-waitlist-offer-'+claim.id},
     body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',
      to:[authUser.user.email],subject:template.subject,html:template.html,text:template.text}),
     signal:AbortSignal.timeout(12000)
    });
    const payload=await response.json().catch(()=>null);
    if(response.ok&&typeof payload?.id==='string'){
     await db.from('notification_deliveries').update({status:'sent',provider_message_id:payload.id,
      updated_at:new Date().toISOString()}).eq('id',claim.id);
     sent++;
    }else{
     await db.from('notification_deliveries').update({status:'failed',
      error_code:'resend_http_'+response.status,updated_at:new Date().toISOString()}).eq('id',claim.id);
    }
   }catch{console.error('Waitlist offer email outcome uncertain');}
  }
  return Response.json({result,emails_sent:sent,
   note:sent===newlyOffered.length?'Offer emails accepted by Resend.':
    'Some offers were created without confirmed email delivery. Check delivery logs and contact affected players manually.'});
 }catch{return Response.json({error:'Unable to process waitlist.'},{status:503});}
}
