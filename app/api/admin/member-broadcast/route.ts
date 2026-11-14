import {createClient} from '@supabase/supabase-js';
import {unsubscribeToken} from '../../../../../lib/announcement-unsubscribe';
export const dynamic='force-dynamic';
export const maxDuration=60;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const site='https://allinsportsnj.com';
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
async function context(request:Request){
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY;
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!url||!key||!secret||!token)return null;
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);
 if(error||!user?.email_confirmed_at||!user.email)return null;
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:admin,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 return roleError||!admin?null:{db,user};
}
async function audience(db:any){
 const [prefs,ann]=await Promise.all([
  db.from('notification_preferences').select('user_id,email_game_alerts,sms_opted_in,sms_game_alerts,sms_opted_out_at,phone_e164').order('user_id').limit(10000),
  db.from('player_announcement_preferences').select('user_id,email_opt_in,sms_opt_in').order('user_id').limit(10000)
 ]);
 if(prefs.error||ann.error||prefs.data?.length===10000||ann.data?.length===10000)throw Error('Audience unavailable or exceeds safety limit');
 const opted=new Map((ann.data||[]).map((p:any)=>[p.user_id,p]));
 return (prefs.data||[]).map((p:any)=>({id:p.user_id,email:!!(p.email_game_alerts&&(opted.get(p.user_id) as any)?.email_opt_in),
  sms:!!(p.sms_opted_in&&p.sms_game_alerts&&!p.sms_opted_out_at&&p.phone_e164?.startsWith('+')&&(opted.get(p.user_id) as any)?.sms_opt_in),phone:p.phone_e164}))
  .filter((p:any)=>p.email||p.sms).sort((a:any,b:any)=>a.id.localeCompare(b.id));
}
export async function GET(request:Request){
 const ctx=await context(request);if(!ctx)return Response.json({error:'Admin access required'},{status:403});
 try{
  const list=await audience(ctx.db);
  return Response.json({email_count:list.filter((x:any)=>x.email).length,sms_count:list.filter((x:any)=>x.sms).length},
   {headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Could not verify opted-in audience'},{status:503});}
}
export async function POST(request:Request){
 const ctx=await context(request);if(!ctx)return Response.json({error:'Admin access required'},{status:403});
 if(process.env.VERCEL_ENV!=='production')return Response.json({error:'Sending is production-only'},{status:403});
 const body=await request.json().catch(()=>null);
 const subject=typeof body?.subject==='string'?body.subject.trim():'';
 const message=typeof body?.message==='string'?body.message.trim():'';
 const email=body?.email===true,sms=body?.sms===true;
 const requestId=typeof body?.request_id==='string'?body.request_id:'';
 if(!uuid.test(requestId)||subject.length>120||message.length<5||message.length>800||!email&&!sms||email&&!subject)
  return Response.json({error:'Subject, message, channels and request ID required'},{status:400});
 if(email&&(!process.env.RESEND_API_KEY||!process.env.ANNOUNCEMENT_UNSUBSCRIBE_SECRET)||
  sms&&(!process.env.TWILIO_ACCOUNT_SID||!process.env.TWILIO_AUTH_TOKEN||!process.env.TWILIO_PHONE_NUMBER))
  return Response.json({error:'Notification provider unavailable'},{status:503});
 const db=ctx.db;
 if(body.action==='test'){
  const own=(await db.from('notification_preferences').select('phone_e164').eq('user_id',ctx.user.id).maybeSingle()).data;
  const testTo=ctx.user.email;
  if(email){
   const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[testTo],subject:'[TEST] '+subject,
     text:message+'\n\nTEST ONLY — not sent to members.'}),signal:AbortSignal.timeout(12000)});
   if(!r.ok)return Response.json({error:'Test email provider rejected request'},{status:502});
  }
  if(sms){
   if(!own?.phone_e164?.startsWith('+'))return Response.json({error:'Your admin profile has no verified phone for a test SMS'},{status:409});
   const twilio=(await import('twilio')).default;
   await twilio(process.env.TWILIO_ACCOUNT_SID!,process.env.TWILIO_AUTH_TOKEN!).messages.create({
    from:process.env.TWILIO_PHONE_NUMBER!,to:own.phone_e164,body:'[AIS TEST] '+message});
  }
  return Response.json({test_sent:true,email_to:email?testTo:null,sms_to:sms?own?.phone_e164:null});
 }
 if(body.action!=='send'||body.confirm!=='SEND_MEMBER_BROADCAST')
  return Response.json({error:'Explicit send confirmation required'},{status:400});
 const cursor=typeof body.cursor==='string'?body.cursor:'';
 if(cursor&&!uuid.test(cursor))return Response.json({error:'Invalid cursor'},{status:400});
 let list;
 try{list=(await audience(db)).filter((p:any)=>(email&&p.email)||(sms&&p.sms));}
 catch{return Response.json({error:'Audience unavailable'},{status:503});}
 const key='member_broadcast:'+requestId;
 const {error:upsertError}=await db.from('notification_events').upsert({
  event_key:key,event_type:'admin_reminder',payload:{subject,message,email,sms,admin_user_id:ctx.user.id,scope:'member_broadcast'}
 },{onConflict:'event_key',ignoreDuplicates:true});
 if(upsertError)return Response.json({error:'Unable to record campaign'},{status:503});
 const {data:event,error:eventError}=await db.from('notification_events').select('id,payload').eq('event_key',key).maybeSingle();
 if(eventError||!event)return Response.json({error:'Campaign record unavailable'},{status:503});
 if(event.payload?.subject!==subject||event.payload?.message!==message||event.payload?.email!==email||
    event.payload?.sms!==sms||event.payload?.admin_user_id!==ctx.user.id)
  return Response.json({error:'Campaign ID already used for different content'},{status:409});
 const batch=list.filter((p:any)=>p.id>cursor).slice(0,10);
 let sentEmail=0,sentSms=0,skipped=0,failed=0;
 for(const p of batch){
  // Consent is checked again for every recipient; delivery claims prevent duplicates.
  const {data:current}=await db.from('notification_preferences').select('email_game_alerts,sms_opted_in,sms_game_alerts,sms_opted_out_at,phone_e164').eq('user_id',p.id).maybeSingle();
  const {data:opt}=await db.from('player_announcement_preferences').select('email_opt_in,sms_opt_in').eq('user_id',p.id).maybeSingle();
  if(!current||!opt){skipped++;continue;}
  const emailAllowed=email&&p.email&&current.email_game_alerts&&opt.email_opt_in;
  const smsAllowed=sms&&p.sms&&current.sms_opted_in&&current.sms_game_alerts&&!current.sms_opted_out_at&&opt.sms_opt_in&&current.phone_e164?.startsWith('+');
  if(emailAllowed){
   const {data:{user:recipient},error:lookupError}=await db.auth.admin.getUserById(p.id);
   const to=recipient?.email_confirmed_at&&recipient.email;
   if(lookupError||!to){skipped++;}
   else{
    const {data:claim,error:claimError}=await db.from('notification_deliveries').insert({event_id:event.id,recipient_user_id:p.id,channel:'email',destination:to,status:'sending',provider:'resend',attempts:1}).select('id').maybeSingle();
    if(claimError){if(claimError.code==='23505')skipped++;else failed++;}
    else if(claim){
     const unsub=site+'/unsubscribe?token='+encodeURIComponent(unsubscribeToken(p.id));
     const oneClick=site+'/api/announcements/one-click?token='+encodeURIComponent(unsubscribeToken(p.id));
     const html='<main style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>All In Sports</h2><p style="white-space:pre-wrap">'+escapeHtml(message)+'</p><p><a href="'+site+'">Visit All In Sports</a></p><p style="font-size:12px"><a href="'+unsub+'">Unsubscribe</a> · <a href="'+site+'/my-all-in">Manage preferences</a></p></main>';
     try{
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'ais-broadcast-'+claim.id},
       body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[to],subject,html,text:message+'\n\n'+site+'\nUnsubscribe: '+unsub,
        headers:{'List-Unsubscribe':'<'+oneClick+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}),signal:AbortSignal.timeout(12000)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.id){failed++;await db.from('notification_deliveries').update({status:'failed',error_code:'resend_http_'+response.status}).eq('id',claim.id);}
      else{sentEmail++;await db.from('notification_deliveries').update({status:'sent',provider_message_id:result.id}).eq('id',claim.id);}
     }catch{failed++;/* uncertain outcome remains claimed; never automatically resend */}
    }
   }
  }
  if(smsAllowed){
   const {data:claim,error:claimError}=await db.from('notification_deliveries').insert({event_id:event.id,recipient_user_id:p.id,channel:'sms',destination:current.phone_e164,status:'sending',provider:'twilio',attempts:1}).select('id').maybeSingle();
   if(claimError){if(claimError.code==='23505')skipped++;else failed++;}
   else if(claim){
    try{
     const twilio=(await import('twilio')).default;
     const result=await twilio(process.env.TWILIO_ACCOUNT_SID!,process.env.TWILIO_AUTH_TOKEN!).messages.create({
      from:process.env.TWILIO_PHONE_NUMBER!,to:current.phone_e164,body:'All In Sports: '+message+'\nReply STOP to opt out.'});
     sentSms++;await db.from('notification_deliveries').update({status:'sent',provider_message_id:result.sid}).eq('id',claim.id);
    }catch{failed++;await db.from('notification_deliveries').update({status:'failed',error_code:'twilio_rejected_or_unknown'}).eq('id',claim.id);}
   }
  }
 }
 const next=batch.length?batch[batch.length-1].id:cursor;
 return Response.json({email_sent:sentEmail,sms_sent:sentSms,failed,skipped,complete:!list.some((p:any)=>p.id>next),next_cursor:next});
}
