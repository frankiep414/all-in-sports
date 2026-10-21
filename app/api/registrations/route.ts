import {sendAdminRegistrationAlert} from '../../../lib/admin-registration-alert';
import {createClient} from '@supabase/supabase-js';
import {sendAutomatedTestRegistrationEmail} from '../../../lib/automated-registration-email';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function session(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return null;
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key||!secret)throw Error('CONFIG');
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);
 if(error||!user?.email||!user.email_confirmed_at)return null;
 return {user,db:createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})};
}
export async function POST(request:Request){
 try{
  const access=await session(request);
  if(!access)return Response.json({error:'Please sign in to register.'},{status:401});
  const body=await request.json();
  if(typeof body.game_id!=='string'||!uuid.test(body.game_id))
   return Response.json({error:'Invalid game.'},{status:400});
  const {data:game,error:gameError}=await access.db.from('pickup_games')
   .select('is_test').eq('id',body.game_id).maybeSingle();
  if(gameError||!game)return Response.json({error:'Game unavailable.'},{status:503});
  if(game.is_test){
   const {data:role,error:roleError}=await access.db.from('admin_users')
    .select('user_id').eq('user_id',access.user.id).maybeSingle();
   if(roleError)return Response.json({error:'Access check unavailable.'},{status:503});
   if(!role)return Response.json({error:'Test games are available only to administrators.'},{status:403});
  }
  const {data:player,error:playerError}=await access.db.from('players')
   .select('id').ilike('email',access.user.email!).maybeSingle();
  if(playerError)return Response.json({error:'Unable to verify Player ID.'},{status:503});
  if(!player)return Response.json({error:'Complete your All In player profile before registering.'},{status:403});
  const registrationType=body.registration_type==='team'?'team':'solo';
  if(registrationType==='team'&&process.env.TEAM_REGISTRATION_ENABLED!=='true')
   return Response.json({error:'Team registration is not enabled yet.'},{status:503});
  if(registrationType==='team'){
   // Pilot is restricted to admin accounts and test games in Vercel Preview.
   // A public team registration is never allowed until a separate rollout.
   if(process.env.VERCEL_ENV!=='preview'||!game.is_test)
    return Response.json({error:'Team registration is limited to admin test games.'},{status:403});
   const {data:pilotAdmin,error:pilotError}=await access.db.from('admin_users')
    .select('user_id').eq('user_id',access.user.id).maybeSingle();
   if(pilotError||!pilotAdmin)
    return Response.json({error:'Team registration is admin-only during testing.'},{status:403});
  }
  const teamName=registrationType==='team'&&typeof body.team_name==='string'?body.team_name.trim():null;
  if(registrationType==='team'&&(!teamName||teamName.length<2||teamName.length>80))
   return Response.json({error:'Enter a team name (2–80 characters).'},{status:400});
  const registrationArgs={p_game_id:body.game_id,p_player_id:String(player.id),p_user_id:access.user.id};
  // Before schema rollout, retain the existing three-argument solo RPC.
  const {data,error}=process.env.TEAM_REGISTRATION_ENABLED==='true'
   ? await access.db.rpc('request_pickup_registration',{...registrationArgs,p_registration_type:registrationType,p_team_name:teamName})
   : await access.db.rpc('request_pickup_registration',registrationArgs);
  if(error){
   if(error.message.includes('REGISTRATION_ALREADY_EXISTS'))return Response.json({error:'You already registered for this game with a different registration type.'},{status:409});
   if(error.message.includes('GAME_FULL'))return Response.json({error:'This game is full.'},{status:409});
   if(error.message.includes('GAME_UNAVAILABLE'))return Response.json({error:'This game is no longer open.'},{status:409});
   if(error.message.includes('REGISTRATION_CANCELLED'))return Response.json({error:'Your registration was cancelled. Contact All In Sports.'},{status:409});
   console.error('Registration failed',{code:error.code});
   return Response.json({error:'Unable to register. Please try again.'},{status:503});
  }
  const row=data?.[0];
  const {data:referenceRow}=await access.db.from('pickup_registrations').select('payment_reference').eq('id',row?.registration_id).eq('user_id',access.user.id).maybeSingle();
  // Idempotent event record only; no delivery is scheduled or sent.
  if(row?.registration_id && ['pending_payment','waitlisted','offered'].includes(row.registration_status)){
   const eventType=row.registration_status==='waitlisted'?'waitlist_joined':'registration_received';
   const {error:eventError}=await access.db.from('notification_events').upsert({
    event_key:`${eventType}:${row.registration_id}`,event_type:eventType,
    game_id:body.game_id,registration_id:row.registration_id,
    payload:{payment_reference:referenceRow?.payment_reference||null}
   },{onConflict:'event_key',ignoreDuplicates:true});
   if(eventError)console.error('Registration notification event failed',{code:eventError.code});
  }
  // Send only on the first notification-event insertion, not repeated signup requests.
  // Existing event rows are deduplicated by their event_key.
  if (row?.registration_id && ['pending_payment','waitlisted','offered'].includes(row.registration_status) && !game.is_test) {
   const eventType=row.registration_status==='waitlisted'?'waitlist_joined':'registration_received';
   const {data:eventRows,error:claimError}=await access.db.from('notification_events').upsert({
    event_key:`admin_alert:${row.registration_id}`,event_type:eventType,
    game_id:body.game_id,registration_id:row.registration_id,
    payload:{admin_alert:true}
   },{onConflict:'event_key',ignoreDuplicates:true}).select('id');
   if(claimError)console.error('Admin pickup alert claim failed',claimError.code);
   if(!claimError && eventRows?.length){
    const [{data:details},{data:playerDetails}]=await Promise.all([
     access.db.from('pickup_games').select('title,venue,starts_at').eq('id',body.game_id).maybeSingle(),
     access.db.from('players').select('full_name').eq('id',player.id).maybeSingle()
    ]);
    await sendAdminRegistrationAlert({kind:'pickup',id:String(row.registration_id),
     name:playerDetails?.full_name||'Player',email:access.user.email!,
     title:details?.title||'Pickup game',status:row.registration_status,
     details:[`Venue: ${details?.venue||'Not provided'}`,`Starts: ${details?.starts_at||'Not provided'}`,
      `Payment reference: ${referenceRow?.payment_reference||'Not assigned'}`]});
   }
  }
  // Preview-only opt-in: deliver registration receipt for test and regular games.
  // Unique notification delivery claim prevents repeat emails.
  if(row?.registration_id && ['pending_payment','waitlisted','offered'].includes(row.registration_status) && referenceRow?.payment_reference){
   const {data:playerName}=await access.db.from('players').select('full_name').eq('id',player.id).maybeSingle();
   try{
    await sendAutomatedTestRegistrationEmail({
     registrationId:row.registration_id,gameId:body.game_id,
     userId:access.user.id,email:access.user.email!,
     playerName:playerName?.full_name||'Player',status:row.registration_status,
     reference:referenceRow.payment_reference
    });
   }catch{console.error('Automatic test email could not complete');}
  }
  return Response.json({registration_id:row?.registration_id,status:row?.registration_status,payment_reference:referenceRow?.payment_reference,
   message:'Registration received. Payment has not been collected or confirmed.'});
 }catch{return Response.json({error:'Unable to register.'},{status:503});}
}
export async function GET(request:Request){
 try{
  const access=await session(request);
  if(!access)return Response.json({error:'Sign in required.'},{status:401});
  const {data,error}=await access.db.from('pickup_registrations')
   .select(process.env.TEAM_REGISTRATION_ENABLED==='true'?'id,game_id,status,payment_status,payment_reference,created_at,registration_type,team_name,spots_reserved':'id,game_id,status,payment_status,payment_reference,created_at')
   .eq('user_id',access.user.id).order('created_at',{ascending:false}).limit(100);
  if(error)return Response.json({error:'Registrations unavailable.'},{status:503});
  return Response.json({registrations:data},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Registrations unavailable.'},{status:503});}
}

export async function DELETE(request:Request){
 try{
  const access=await session(request);
  if(!access)return Response.json({error:'Sign in required.'},{status:401});
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.registration_id!=='string'||!uuid.test(body.registration_id))
   return Response.json({error:'Invalid registration.'},{status:400});
  const {data:registration,error:lookupError}=await access.db.from('pickup_registrations')
   .select('id,status,payment_status').eq('id',body.registration_id).eq('user_id',access.user.id).maybeSingle();
  if(lookupError)return Response.json({error:'Unable to verify registration.'},{status:503});
  if(!registration)return Response.json({error:'Registration not found.'},{status:404});
  if(!['pending_payment','offered','confirmed','waitlisted'].includes(registration.status))
   return Response.json({error:'This registration is no longer active.'},{status:409});
  // Do not modify payment_status, references, or Stripe records. Withdrawals are not refunds.
  // Conditional status update prevents a second withdrawal from changing an already cancelled record.
  const {data:updated,error:updateError}=await access.db.from('pickup_registrations')
   .update({status:'cancelled'}).eq('id',registration.id).eq('user_id',access.user.id)
   .eq('status',registration.status).select('id').maybeSingle();
  if(updateError)return Response.json({error:'Unable to withdraw. Please contact All In Sports.'},{status:503});
  if(!updated)return Response.json({error:'Registration changed. Refresh and try again.'},{status:409});
  return Response.json({withdrawn:true,refund_issued:false,contact_management_for_reimbursement:registration.payment_status==='paid'},
   {headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Unable to withdraw. Please try again.'},{status:503});}
}
