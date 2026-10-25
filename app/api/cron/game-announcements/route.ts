import {createClient} from '@supabase/supabase-js';
import {gamePublishedEmail} from '../../../../lib/notification-email-templates';
import {unsubscribeToken} from '../../../../lib/announcement-unsubscribe';
export const dynamic='force-dynamic';

// Called by a scheduler with Authorization: Bearer <CRON_SECRET>.
// Intentionally email-only for the first rollout; SMS remains disabled.
export async function GET(request:Request){
 const cronSecret=process.env.CRON_SECRET;
 if(!cronSecret||request.headers.get('authorization')!=='Bearer '+cronSecret)
  return Response.json({error:'Unauthorized'},{status:401});
 if(process.env.GAME_PUBLISHED_AUTO_EMAIL_ENABLED!=='true')
  return Response.json({enabled:false,sent:0});
 const site=(process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\\/$/,'');
 const activation=process.env.GAME_ALERTS_NOT_BEFORE;
 if(!activation||!Number.isFinite(Date.parse(activation))||!site.startsWith('https://')||
   (process.env.VERCEL_ENV==='production'&&site!=='https://allinsportsnj.com'))
  return Response.json({error:'Activation time or site URL not configured'},{status:503});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY,resend=process.env.RESEND_API_KEY;
 if(!url||!secret||!resend||!process.env.ANNOUNCEMENT_UNSUBSCRIBE_SECRET)
  return Response.json({error:'Provider configuration incomplete'},{status:503});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:events,error:eventError}=await db.from('notification_events')
  .select('id,game_id,created_at').eq('event_type','game_published')
  .gte('created_at',new Date(activation).toISOString())
  .order('created_at',{ascending:true}).limit(20);
 if(eventError)return Response.json({error:'Unable to load publication events'},{status:503});
 const allow=(process.env.GAME_ALERTS_EMAIL_ALLOWLIST||'').split(',')
  .map(x=>x.trim().toLowerCase()).filter(Boolean);
 // Require an allowlist in Preview; never accidentally blast real users from staging.
 if(process.env.VERCEL_ENV!=='production'&&!allow.length)
  return Response.json({error:'Preview allowlist required'},{status:503});
 let sent=0,skipped=0,failed=0;
 for(const event of events||[]){
  if(!event.game_id)continue;
  const {data:game,error:gameError}=await db.from('pickup_games')
   .select('id,title,venue,starts_at,status,is_test').eq('id',event.game_id).maybeSingle();
  if(gameError||!game||game.status!=='published'||new Date(game.starts_at)<=new Date()||
     (process.env.VERCEL_ENV==='production'&&game.is_test))continue;
  // Bound the work per run; repeat scheduled invocations pick up unsent recipients.
  const {data:prefs,error:prefError}=await db.from('player_announcement_preferences')
   .select('user_id').eq('email_opt_in',true).order('user_id').limit(1000);
  if(prefError)return Response.json({error:'Unable to read member preferences'},{status:503});
  for(const pref of prefs||[]){
   if(sent+failed>=15)break;
   const {data:{user},error:userError}=await db.auth.admin.getUserById(pref.user_id);
   if(userError||!user?.email_confirmed_at||!user.email){skipped++;continue;}
   const email=user.email.toLowerCase();
   if((process.env.VERCEL_ENV!=='production'||allow.length)&&!allow.includes(email)){skipped++;continue;}
   const {data:player,error:playerError}=await db.from('players').select('id').ilike('email',email).limit(1);
   if(playerError){failed++;continue;}
   if(!player?.length){skipped++;continue;}
   const {data:existing,error:existingError}=await db.from('notification_deliveries')
    .select('id').eq('event_id',event.id).eq('channel','email').eq('destination',email).limit(1);
   if(existingError){failed++;continue;}
   if(existing?.length)continue;
   const {data:current,error:consentError}=await db.from('player_announcement_preferences')
    .select('email_opt_in').eq('user_id',pref.user_id).maybeSingle();
   if(consentError||current?.email_opt_in!==true){skipped++;continue;}
   const {data:claim,error:claimError}=await db.from('notification_deliveries').insert({
    event_id:event.id,recipient_user_id:pref.user_id,channel:'email',
    destination:email,status:'sending',provider:'resend',attempts:1
   }).select('id').single();
   if(claimError){if(claimError.code!=='23505')failed++;continue;}
   const template=gamePublishedEmail({title:game.title,venue:game.venue,
    startsAt:new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'full',timeStyle:'short'})});
   const register=site+'/play?game='+encodeURIComponent(game.id);
   const unsub=site+'/unsubscribe?token='+encodeURIComponent(unsubscribeToken(pref.user_id));
   const oneClick=site+'/api/announcements/one-click?token='+encodeURIComponent(unsubscribeToken(pref.user_id));
   const html=template.html.replace('</main>','<p><a href="'+register+'">REGISTER NOW</a></p><p><a href="'+unsub+'">Unsubscribe</a></p></main>');
   try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{
     Authorization:'Bearer '+resend,'Content-Type':'application/json','Idempotency-Key':'all-in-auto-game-'+claim.id
    },body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[email],
     subject:template.subject,html,text:template.text+'\\nRegister: '+register+'\\nUnsubscribe: '+unsub,
     headers:{'List-Unsubscribe':'<'+oneClick+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}),
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
    // Keep 'sending' to avoid duplicate mail on an uncertain provider outcome.
    console.error('Automatic email outcome uncertain',claim.id);
   }
  }
  if(sent+failed>=15)break;
 }
 return Response.json({enabled:true,sent,skipped,failed,events_checked:events?.length||0});
}
