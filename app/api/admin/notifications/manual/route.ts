import {unsubscribeToken} from '../../../../../lib/announcement-unsubscribe';
import {createClient} from '@supabase/supabase-js';
import twilio from 'twilio';
export const dynamic='force-dynamic';
export const maxDuration=60;

export async function POST(request:Request){
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key||!secret)return Response.json({error:'Server configuration missing.'},{status:503});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return Response.json({error:'Sign in required.'},{status:401});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await auth.auth.getUser(token);
 if(!user?.email_confirmed_at)return Response.json({error:'Sign in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(!admin)return Response.json({error:'Admin only.'},{status:403});
 const body=await request.json().catch(()=>({}));
 const gameId=typeof body.game_id==='string'?body.game_id:'';
 if(!/^[0-9a-f-]{36}$/i.test(gameId))return Response.json({error:'Invalid game.'},{status:400});
 const {data:game}=await db.from('pickup_games').select('id,title,venue,starts_at,status,is_test').eq('id',gameId).maybeSingle();
 if(!game||game.status!=='published'||new Date(game.starts_at).getTime()<=Date.now())
  return Response.json({error:'Choose an upcoming published game.'},{status:409});
 const preferences: Array<{user_id:string;email_game_alerts:boolean;sms_opted_in:boolean;sms_game_alerts:boolean;sms_opted_out_at:string|null;phone_e164:string|null}>=[];
 const announcements: Array<{user_id:string;email_opt_in:boolean;sms_opt_in:boolean}>=[];
 const pageSize=500;
 for(let offset=0;offset<100000;offset+=pageSize){
  const {data,error}=await db.from('notification_preferences')
   .select('user_id,email_game_alerts,sms_opted_in,sms_game_alerts,sms_opted_out_at,phone_e164')
   .order('user_id').range(offset,offset+pageSize-1);
  if(error)return Response.json({error:'Unable to verify notification preferences.'},{status:503});
  preferences.push(...(data||[]));
  if((data||[]).length<pageSize)break;
  if(offset+pageSize>=100000)return Response.json({error:'Audience safety limit reached.'},{status:503});
 }
 for(let offset=0;offset<100000;offset+=pageSize){
  const {data,error}=await db.from('player_announcement_preferences')
   .select('user_id,email_opt_in,sms_opt_in').order('user_id').range(offset,offset+pageSize-1);
  if(error)return Response.json({error:'Unable to verify announcement preferences.'},{status:503});
  announcements.push(...(data||[]));
  if((data||[]).length<pageSize)break;
  if(offset+pageSize>=100000)return Response.json({error:'Audience safety limit reached.'},{status:503});
 }
 const byUser=new Map((announcements||[]).map(p=>[p.user_id,p]));
 const emailUsers=(preferences||[]).filter(p=>p.email_game_alerts&&byUser.get(p.user_id)?.email_opt_in===true).sort((a,b)=>a.user_id.localeCompare(b.user_id));
 const smsUsers=(preferences||[]).filter(p=>p.sms_opted_in&&p.sms_game_alerts&&!p.sms_opted_out_at&&p.phone_e164?.startsWith('+')&&byUser.get(p.user_id)?.sms_opt_in===true).sort((a,b)=>a.user_id.localeCompare(b.user_id));
 if(body.action==='history'){
  const {data:events,error}=await db.from('notification_events')
   .select('id,created_at,payload').eq('game_id',gameId).eq('event_type','admin_reminder')
   .order('created_at',{ascending:false}).limit(20);
  if(error)return Response.json({error:'Unable to load reminder history.'},{status:503});
  const history=[];
  for(const event of events||[]){
   const {data:deliveries,error:deliveryError}=await db.from('notification_deliveries')
    .select('channel,status').eq('event_id',event.id).limit(5000);
   if(deliveryError)return Response.json({error:'Unable to load reminder deliveries.'},{status:503});
   history.push({id:event.id,created_at:event.created_at,subject:event.payload?.subject||'',
    message:event.payload?.message||'',email_sent:(deliveries||[]).filter(d=>d.channel==='email'&&d.status==='sent').length,
    sms_sent:(deliveries||[]).filter(d=>d.channel==='sms'&&d.status==='sent').length,
    pending:(deliveries||[]).filter(d=>d.status==='sending'||d.status==='queued').length,
    failed:(deliveries||[]).filter(d=>d.status==='failed').length});
  }
  return Response.json({history});
 }
 if(body.action==='preview')return Response.json({game_title:game.title,email_count:emailUsers.length,sms_count:smsUsers.length});
 if(body.action!=='send')return Response.json({error:'Unknown action.'},{status:400});

 const message=typeof body.message==='string'?body.message.trim():'';
 const subject=typeof body.subject==='string'?body.subject.trim():'';
 const sendEmail=body.email===true,sendSms=body.sms===true;
 const requestId=typeof body.request_id==='string'?body.request_id:'';
 if(message.length<5||message.length>800||subject.length>120||!sendEmail&&!sendSms||
    !/^[0-9a-f-]{36}$/i.test(requestId)||body.confirm!=='SEND_GAME_NOTIFICATION')
  return Response.json({error:'Provide a message, channel, request ID, and explicit confirmation.'},{status:400});
 if(sendEmail&&(!process.env.RESEND_API_KEY||!process.env.ANNOUNCEMENT_UNSUBSCRIBE_SECRET)||sendSms&&(!process.env.TWILIO_ACCOUNT_SID||!process.env.TWILIO_AUTH_TOKEN||!process.env.TWILIO_PHONE_NUMBER))
  return Response.json({error:'Selected notification provider is not configured.'},{status:503});
 const offset=Number(body.offset??0);
 if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return Response.json({error:'Invalid batch offset.'},{status:400});
 const batchSize=10;
 // Stable user-id cursor: opt-out changes must not shift an offset into a changing audience.
 const cursor=typeof body.cursor==='string'?body.cursor:'';
 if(cursor&&!/^[0-9a-f-]{36}$/i.test(cursor))return Response.json({error:'Invalid recipient cursor.'},{status:400});
 const nextUsers=Array.from(new Set([
  ...(sendEmail?emailUsers.map(p=>p.user_id):[]),
  ...(sendSms?smsUsers.map(p=>p.user_id):[])
 ])).sort().filter(id=>id>cursor).slice(0,batchSize);
 const selected=new Set(nextUsers);
 const emailBatch=sendEmail?emailUsers.filter(p=>selected.has(p.user_id)):[];
 const smsBatch=sendSms?smsUsers.filter(p=>selected.has(p.user_id)):[];
 const nextCursor=nextUsers[nextUsers.length-1]||cursor;
 const complete=!Array.from(new Set([
  ...(sendEmail?emailUsers.map(p=>p.user_id):[]),
  ...(sendSms?smsUsers.map(p=>p.user_id):[])
 ])).some(id=>id>nextCursor);
 const eventKey='admin_reminder:'+gameId+':'+requestId;
 const {data:event,error:eventError}=await db.from('notification_events').upsert({
   event_key:eventKey,event_type:'admin_reminder',game_id:gameId,
   payload:{message,subject,email:sendEmail,sms:sendSms,admin_user_id:user.id}
 },{onConflict:'event_key',ignoreDuplicates:true}).select('id,payload').maybeSingle();
 if(eventError)return Response.json({error:'Unable to record reminder.'},{status:503});
 // An existing request ID must not be reused with different content.
 let activeEvent=event;
 if(!activeEvent){
  const {data:existing}=await db.from('notification_events').select('id,payload').eq('event_key',eventKey).maybeSingle();
  if(!existing)return Response.json({error:'Unable to recover reminder record.'},{status:503});
  const p=existing.payload as Record<string,unknown>;
  if(p.message!==message||p.subject!==subject||p.email!==sendEmail||p.sms!==sendSms)
   return Response.json({error:'This send ID was already used for another message.'},{status:409});
  activeEvent=existing;
 }
 const register=process.env.NEXT_PUBLIC_SITE_URL||'https://allinsportsnj.com';
 const gameLink=(register.endsWith('/')?register.slice(0,-1):register)+'/play?game='+encodeURIComponent(gameId);
 const when=new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'});
 const emailHtml=(userId:string)=>'<div style="font-family:Arial,sans-serif;white-space:pre-wrap">'+escapeHtml(message)+'</div><p><a href="'+gameLink+'">View game / sign up</a></p><p><a href="'+register.replace(/[/]$/,'')+'/unsubscribe?token='+encodeURIComponent(unsubscribeToken(userId))+'">Unsubscribe from announcements</a></p>';
 const smsBody='All In Sports: '+message+' | '+game.title+' '+when+' '+gameLink+' Reply STOP to opt out.';
 if(sendSms&&smsBody.length>1200)return Response.json({error:'SMS message too long. Shorten the message.'},{status:400});
 let emailSent=0,smsSent=0,failed=0,skipped=0;
 const twilioClient=sendSms?twilio(process.env.TWILIO_ACCOUNT_SID!,process.env.TWILIO_AUTH_TOKEN!):null;
 async function claim(userId:string,channel:'email'|'sms',destination:string){
  const {data,error}=await db.from('notification_deliveries').insert({
   event_id:activeEvent!.id,recipient_user_id:userId,channel,destination,status:'sending',
   provider:channel==='email'?'resend':'twilio',attempts:1
  }).select('id').single();
  if(error){if(error.code!=='23505')failed++;else skipped++;return null;}
  return data.id as string;
 }
 async function verifiedEmail(userId:string){
  const {data:{user:recipient},error}=await db.auth.admin.getUserById(userId);
  if(error||!recipient?.email_confirmed_at||!recipient.email)return null;
  const {data:players,error:playerError}=await db.from('players').select('id').ilike('email',recipient.email).limit(1);
  if(playerError||!players?.length)return null;
  return recipient.email;
 }
 for(const pref of emailBatch){
  const email=await verifiedEmail(pref.user_id);
  if(!email){skipped++;continue;}
  const {data:latest}=await db.from('player_announcement_preferences').select('email_opt_in').eq('user_id',pref.user_id).maybeSingle();
  const {data:latestPref}=await db.from('notification_preferences').select('email_game_alerts').eq('user_id',pref.user_id).maybeSingle();
  if(!latest?.email_opt_in||!latestPref?.email_game_alerts){skipped++;continue;}
  const deliveryId=await claim(pref.user_id,'email',email);
  if(!deliveryId)continue;
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{
    Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json',
    'Idempotency-Key':'all-in-manual-'+deliveryId
   },body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[email],
    subject:subject||'All In Sports game reminder',html:emailHtml(pref.user_id),text:message+'\\n'+gameLink+'\\nUnsubscribe: '+register.replace(/[/]$/,'')+'/unsubscribe?token='+encodeURIComponent(unsubscribeToken(pref.user_id))}),
    signal:AbortSignal.timeout(10000)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||typeof result.id!=='string'){
    failed++;
    await db.from('notification_deliveries').update({status:'failed',error_code:'resend_http_'+response.status}).eq('id',deliveryId);
   }else{
    emailSent++;
    await db.from('notification_deliveries').update({status:'sent',provider_message_id:result.id}).eq('id',deliveryId);
   }
  }catch{failed++;/* Uncertain provider outcome: retain sending to avoid duplicates. */}
 }
 for(const pref of smsBatch){
  const email=await verifiedEmail(pref.user_id);
  if(!email){skipped++;continue;}
  const {data:latest}=await db.from('player_announcement_preferences').select('sms_opt_in').eq('user_id',pref.user_id).maybeSingle();
  const {data:latestPref}=await db.from('notification_preferences').select('sms_opted_in,sms_game_alerts,sms_opted_out_at,phone_e164').eq('user_id',pref.user_id).maybeSingle();
  if(!latest?.sms_opt_in||!latestPref?.sms_opted_in||!latestPref.sms_game_alerts||latestPref.sms_opted_out_at||latestPref.phone_e164!==pref.phone_e164){skipped++;continue;}
  const deliveryId=await claim(pref.user_id,'sms',pref.phone_e164!);
  if(!deliveryId)continue;
  try{
   const result=await twilioClient!.messages.create({to:pref.phone_e164!,from:process.env.TWILIO_PHONE_NUMBER!,body:smsBody});
   smsSent++;
   await db.from('notification_deliveries').update({status:'sent',provider_message_id:result.sid}).eq('id',deliveryId);
  }catch{failed++;/* Uncertain provider outcome: retain sending to avoid duplicates. */}
 }
 return Response.json({event_id:activeEvent.id,email_sent:emailSent,sms_sent:smsSent,failed,skipped,next_cursor:nextCursor,complete});
}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
