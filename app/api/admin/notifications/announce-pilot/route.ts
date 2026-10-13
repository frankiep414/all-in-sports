import {createClient} from '@supabase/supabase-js';
import {gamePublishedEmail} from '../../../../../lib/notification-email-templates';
export const dynamic='force-dynamic';
// Manual preview pilot: maximum ONE explicitly allowlisted, opted-in player.
// Never broadcast, never SMS, never auto-trigger on game publication.
export async function POST(request:Request){
 if(process.env.VERCEL_ENV!=='preview')return Response.json({error:'Preview only.'},{status:403});
 if(process.env.PICKUP_ANNOUNCEMENT_PILOT_ENABLED!=='true')
  return Response.json({error:'Pilot is disabled. No email sent.'},{status:403});
 const allowed=(process.env.PICKUP_ANNOUNCEMENT_PILOT_EMAIL||'').trim().toLowerCase();
 if(!allowed||!/^\S+@\S+\.\S+$/.test(allowed))
  return Response.json({error:'Configure one pilot email recipient first.'},{status:503});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY,resend=process.env.RESEND_API_KEY;
 if(!url||!key||!secret||!resend)return Response.json({error:'Missing server configuration.'},{status:503});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return Response.json({error:'Sign in required.'},{status:401});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.email_confirmed_at)return Response.json({error:'Sign in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:role,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError||!role)return Response.json({error:'Admin only.'},{status:403});
 const body=await request.json().catch(()=>({}));
 const id=typeof body.game_id==='string'?body.game_id:'';
 if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'Invalid game.'},{status:400});
 const {data:game,error:gameError}=await db.from('pickup_games').select('id,title,venue,starts_at,status').eq('id',id).maybeSingle();
 if(gameError||!game||game.status!=='published'||new Date(game.starts_at)<=new Date())
  return Response.json({error:'Choose an upcoming published game.'},{status:409});
 // Resolve an authenticated user by email; do not trust an arbitrary recipient from request body.
 const {data:players,error:playersError}=await db.from('players').select('email').ilike('email',allowed).limit(1);
 if(playersError||!players?.length)return Response.json({error:'Pilot recipient has no Player ID.'},{status:409});
 const {data:users,error:usersError}=await db.auth.admin.listUsers({page:1,perPage:1000});
 if(usersError)return Response.json({error:'Unable to validate pilot account.'},{status:503});
 const recipient=users.users.find(u=>u.email?.toLowerCase()===allowed&&!!u.email_confirmed_at);
 if(!recipient)return Response.json({error:'Pilot recipient must have a verified login.'},{status:409});
 const {data:pref,error:prefError}=await db.from('player_announcement_preferences')
  .select('email_opt_in').eq('user_id',recipient.id).maybeSingle();
 if(prefError||pref?.email_opt_in!==true)return Response.json({error:'Pilot recipient has not opted in to email announcements.'},{status:409});
 const eventKey='game_published:'+id;
 const {error:upsertError}=await db.from('notification_events').upsert({
  event_key:eventKey,event_type:'game_published',game_id:id,payload:{source:'pilot_announcement'}
 },{onConflict:'event_key',ignoreDuplicates:true});
 if(upsertError)return Response.json({error:'Unable to record announcement event.'},{status:503});
 const {data:event,error:eventError}=await db.from('notification_events').select('id').eq('event_key',eventKey).maybeSingle();
 if(eventError||!event)return Response.json({error:'Announcement event unavailable.'},{status:503});
 const {data:claim,error:claimError}=await db.from('notification_deliveries').insert({
  event_id:event.id,recipient_user_id:recipient.id,channel:'email',destination:allowed,
  status:'sending',provider:'resend',attempts:1
 }).select('id').single();
 if(claimError||!claim)return Response.json({error:'Already sent or attempted for this game and player. No duplicate sent.'},{status:409});
 const template=gamePublishedEmail({title:game.title,venue:game.venue,
  startsAt:new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'full',timeStyle:'short'})});
 const link=new URL('/play?game='+encodeURIComponent(id),request.url).toString();
 const manage=new URL('/my-all-in',request.url).toString();
 const html=template.html.replace('</main>',
  '<p style="margin:24px 0"><a href="'+link+'" style="display:inline-block;background:#a9dbff;color:#07111d;padding:14px 22px;border-radius:9px;font-weight:bold;text-decoration:none">REGISTER NOW →</a></p>'+
  '<p style="font-size:12px">You opted in to All In Sports announcements. <a href="'+manage+'">Manage email preferences</a>.</p></main>');
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{
   Authorization:'Bearer '+resend,'Content-Type':'application/json',
   'Idempotency-Key':'all-in-game-pilot-'+claim.id
  },body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[allowed],
   subject:'[PREVIEW PILOT] '+template.subject,html,
   text:template.text+'\n\nRegister: '+link+'\nManage email preferences: '+manage}),
   signal:AbortSignal.timeout(12000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||typeof result.id!=='string'){
   await db.from('notification_deliveries').update({status:'failed',error_code:'resend_http_'+response.status,updated_at:new Date().toISOString()}).eq('id',claim.id);
   return Response.json({error:'Provider rejected email. Review delivery record before retrying.'},{status:502});
  }
  await db.from('notification_deliveries').update({status:'sent',provider_message_id:result.id,updated_at:new Date().toISOString()}).eq('id',claim.id);
  return Response.json({sent:true,recipient:allowed,mode:'single-recipient-preview-pilot'});
 }catch{
  return Response.json({error:'Email outcome uncertain; check Resend before retrying.'},{status:502});
 }
}
