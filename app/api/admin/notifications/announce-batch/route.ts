import {createClient} from '@supabase/supabase-js';
import {gamePublishedEmail} from '../../../../../lib/notification-email-templates';
import {unsubscribeToken} from '../../../../../lib/announcement-unsubscribe';
export const dynamic='force-dynamic';
// Preview-only, explicitly enabled, admin-confirmed bounded email batches.
// No SMS and no automatic publishing hook. Each attempt is durably claimed first.
export async function POST(request:Request){
 if(!((process.env.VERCEL_ENV==='preview'&&process.env.PICKUP_ANNOUNCEMENT_BATCH_ENABLED==='true')||(process.env.VERCEL_ENV==='production'&&process.env.PICKUP_ANNOUNCEMENT_LIVE_ENABLED==='true')))
  return Response.json({error:'Bulk announcements disabled.'},{status:403});
 // Fail closed: every Preview recipient must be on an explicit, server-side allowlist.
 // Do not fall back to all opted-in users when the list is empty or malformed.
 const live=process.env.VERCEL_ENV==='production';
 const rawAllowlist=process.env.PICKUP_ANNOUNCEMENT_BATCH_ALLOWLIST||'';
 const allowedEmails=rawAllowlist.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
 if((!live&&!allowedEmails.length)||allowedEmails.length>20||allowedEmails.some(email=>!/^\S+@\S+\.\S+$/.test(email)))
  return Response.json({error:'Configure a valid recipient allowlist (required in Preview; optional in Production).'},{status:503});
 const allowlist=new Set(allowedEmails);
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY,resend=process.env.RESEND_API_KEY;
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!url||!key||!secret||!resend)return Response.json({error:'Server configuration missing.'},{status:503});
 if(!token)return Response.json({error:'Sign in required.'},{status:401});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.email_confirmed_at)return Response.json({error:'Sign in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:role,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError||!role)return Response.json({error:'Admin only.'},{status:403});
 const body=await request.json().catch(()=>({}));
 const id=typeof body.game_id==='string'?body.game_id:'';
 if(!/^[0-9a-f-]{36}$/i.test(id)||body.confirm!=='SEND_OPTED_IN_EMAIL_BATCH')
  return Response.json({error:'Game and explicit confirmation required.'},{status:400});
 const {data:game,error:gameError}=await db.from('pickup_games')
  .select('id,title,venue,starts_at,status').eq('id',id).maybeSingle();
 if(gameError||!game||game.status!=='published'||new Date(game.starts_at)<=new Date())
  return Response.json({error:'Choose an upcoming published game.'},{status:409});
 // Atomically acquire the per-game lease before reading or sending anything.
 const {data:locked,error:lockError}=await db.rpc('claim_announcement_batch',{p_game_id:id,p_admin_id:user.id});
 if(lockError)return Response.json({error:'Unable to acquire announcement batch lock.'},{status:503});
 if(locked!==true)return Response.json({error:'This game batch is already running or complete. Refresh saved progress.'},{status:409});
 try{
 // The server owns the cursor. Never trust a client-supplied continuation offset.
 const {data:checkpoint,error:checkpointError}=await db.from('announcement_batch_progress')
  .select('after_user_id,processed,sent,skipped,failed,complete').eq('game_id',id).maybeSingle();
 if(checkpointError)return Response.json({error:'Unable to load saved batch progress.'},{status:503});
 if(checkpoint?.complete)return Response.json({sent:0,skipped:0,failed:0,processed:0,
  next_cursor:null,complete:true,progress:checkpoint,mode:'manual_preview_batch'});
 // Limit each invocation to 20 candidates; page using cursor, not unbounded loops.
 const cursor=checkpoint?.after_user_id||null;
 let query=db.from('player_announcement_preferences').select('user_id')
  .eq('email_opt_in',true).order('user_id',{ascending:true}).limit(20);
 if(cursor)query=query.gt('user_id',cursor);
 const {data:preferences,error:prefError}=await query;
 if(prefError)return Response.json({error:'Unable to read consent records.'},{status:503});
 const entries=preferences||[];
 if(!entries.length){
  const {data:saved,error:saveError}=await db.rpc('finish_announcement_batch',{
   p_game_id:id,p_admin_id:user.id,p_after_user_id:cursor,
   p_processed:0,p_sent:0,p_skipped:0,p_failed:0,p_complete:true});
  if(saveError||saved!==true)return Response.json({error:'Unable to save completion checkpoint.'},{status:503});
  const {data:progress}=await db.from('announcement_batch_progress')
   .select('after_user_id,processed,sent,skipped,failed,complete').eq('game_id',id).single();
  return Response.json({sent:0,skipped:0,failed:0,processed:0,next_cursor:null,complete:true,progress});
 }
 const eventKey='game_published:'+id;
 const {error:upsertError}=await db.from('notification_events').upsert({
  event_key:eventKey,event_type:'game_published',game_id:id,payload:{source:'admin_email_batch'}
 },{onConflict:'event_key',ignoreDuplicates:true});
 if(upsertError)return Response.json({error:'Unable to record event.'},{status:503});
 const {data:event,error:eventError}=await db.from('notification_events').select('id').eq('event_key',eventKey).maybeSingle();
 if(eventError||!event)return Response.json({error:'Announcement event missing.'},{status:503});
 const template=gamePublishedEmail({title:game.title,venue:game.venue,
  startsAt:new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'full',timeStyle:'short'})});
 // Only trusted configured site origin may appear in email links.
 const site=(process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'');
 if(!site||!/^https:\/\//.test(site))return Response.json({error:'Set HTTPS NEXT_PUBLIC_SITE_URL for email links.'},{status:503});
 const link=site+'/play?game='+encodeURIComponent(id);
 const manage=site+'/my-all-in';
 if(!process.env.ANNOUNCEMENT_UNSUBSCRIBE_SECRET||process.env.ANNOUNCEMENT_UNSUBSCRIBE_SECRET.length<32)
  return Response.json({error:'Set ANNOUNCEMENT_UNSUBSCRIBE_SECRET (32+ characters) before sending.'},{status:503});
 let sent=0,skipped=0,failed=0;
 for(const entry of entries){
  // Re-check consent and current game state immediately before each send.
  const {data:current,error:currentError}=await db.from('player_announcement_preferences')
   .select('email_opt_in').eq('user_id',entry.user_id).maybeSingle();
  const {data:liveGame,error:liveError}=await db.from('pickup_games')
   .select('status,starts_at').eq('id',id).maybeSingle();
  if(currentError||liveError){failed++;continue;}
  if(current?.email_opt_in!==true||liveGame?.status!=='published'||new Date(liveGame.starts_at)<=new Date()){skipped++;continue;}
  const {data:{user:recipient},error:recipientError}=await db.auth.admin.getUserById(entry.user_id);
  const email=recipient?.email?.trim().toLowerCase();
  if(recipientError||!recipient?.email_confirmed_at||!email){skipped++;continue;}
  if((!live||allowlist.size>0)&&!allowlist.has(email)){skipped++;continue;}
  const {data:player,error:playerError}=await db.from('players').select('id').ilike('email',email).limit(1);
  if(playerError){failed++;continue;}
  if(!player?.length){skipped++;continue;}
  const {data:claim,error:claimError}=await db.from('notification_deliveries').insert({
   event_id:event.id,recipient_user_id:entry.user_id,channel:'email',destination:email,
   status:'sending',provider:'resend',attempts:1
  }).select('id').single();
  if(claimError){
   // Unique-constraint conflicts mean this player/game/channel was already claimed.
   // Other database failures must not be mislabeled as duplicate skips.
   if(claimError.code==='23505')skipped++;
   else{
    failed++;
    console.error('Unable to claim announcement delivery',claimError.code);
   }
   continue;
  }
  if(!claim){failed++;continue;}
  const unsubscribe=site+'/unsubscribe?token='+encodeURIComponent(unsubscribeToken(entry.user_id));
  const providerUnsubscribe=site+'/api/announcements/one-click?token='+encodeURIComponent(unsubscribeToken(entry.user_id));
  const html=template.html.replace('</main>',
   '<p style="margin:24px 0"><a href="'+link+'" style="display:inline-block;background:#a9dbff;color:#07111d;padding:14px 22px;border-radius:9px;font-weight:bold;text-decoration:none">REGISTER NOW →</a></p>'+
   '<p style="font-size:12px">You subscribed to All In Sports announcements. <a href="'+manage+'">Manage email preferences</a> · <a href="'+unsubscribe+'">Unsubscribe</a>.</p></main>');
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{
    Authorization:'Bearer '+resend,'Content-Type':'application/json','Idempotency-Key':'all-in-game-batch-'+claim.id
   },body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[email],
    subject:'[PREVIEW] '+template.subject,html,headers:{'List-Unsubscribe':'<'+providerUnsubscribe+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'},
    text:template.text+'\n\nRegister: '+link+'\nManage email preferences: '+manage+'\nUnsubscribe: '+unsubscribe}),
    signal:AbortSignal.timeout(10000)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||typeof result.id!=='string'){
    failed++;
    await db.from('notification_deliveries').update({status:'failed',error_code:'resend_http_'+response.status,updated_at:new Date().toISOString()}).eq('id',claim.id);
   }else{
    sent++;
    await db.from('notification_deliveries').update({status:'sent',provider_message_id:result.id,updated_at:new Date().toISOString()}).eq('id',claim.id);
   }
  }catch{
   failed++;
   // Keep sending status: uncertain outcome must not be automatically retried.
   console.error('Batch email outcome uncertain for claim',claim.id);
  }
 }
 const complete=entries.length<20;
 const nextCursor=entries[entries.length-1].user_id;
 const {data:saved,error:saveError}=await db.rpc('finish_announcement_batch',{
  p_game_id:id,p_admin_id:user.id,p_after_user_id:nextCursor,
  p_processed:entries.length,p_sent:sent,p_skipped:skipped,p_failed:failed,p_complete:complete});
 if(saveError||saved!==true)return Response.json({error:'Emails processed but checkpoint could not be saved. Do not retry until progress is reviewed.'},{status:503});
 const {data:progress,error:readError}=await db.from('announcement_batch_progress')
  .select('after_user_id,processed,sent,skipped,failed,complete').eq('game_id',id).single();
 if(readError||!progress)return Response.json({error:'Checkpoint saved but progress could not be read. Refresh dashboard.'},{status:503});
 return Response.json({sent,skipped,failed,processed:entries.length,
  next_cursor:complete?null:nextCursor,complete,progress,mode:'manual_preview_batch'});
 }finally{
  // If an early validation error or exception occurs, release the lease.
  // A completed batch has already cleared its lease atomically.
  const {error:releaseError}=await db.rpc('release_announcement_batch',{p_game_id:id,p_admin_id:user.id});
  if(releaseError)console.error('Unable to release announcement batch lock',releaseError.code);
 }
}
