import { createClient } from '@supabase/supabase-js';
import { after } from 'next/server';

async function getAdmin(request: Request) {
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token) return {status:401 as const};
 const url=process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!url || !key || !secret) return {status:500 as const};
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);
 if(error || !user?.email_confirmed_at) return {status:401 as const};
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:role,error:roleError}=await admin.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError) return {status:500 as const};
 if(!role) return {status:403 as const};
 return {admin};
}

export async function GET(request: Request) {
 try {
  const access=await getAdmin(request);
  if(!access.admin) return Response.json({error:'Administrator access required.'},{status:access.status || 403});
  const {data,error}=await access.admin.from('pickup_games')
    .select('id,title,venue,starts_at,ends_at,price_cents,capacity,status,created_at,series_id,occurrence_index,is_test')
    .order('starts_at',{ascending:true}).limit(100);
  if(error) return Response.json({error:'Unable to load games.'},{status:500});
  const counts=new Map<string,{registered:number;paid:number}>();
  const ids=(data||[]).map(g=>g.id);
  if(ids.length){
   // Paginate all registrations so the quick view cannot silently undercount.
   for(let offset=0;offset<100000;offset+=500){
    const {data:registrations,error:registrationError}=await access.admin.from('pickup_registrations')
     .select('game_id,status,payment_status').in('game_id',ids)
     .range(offset,offset+499);
    if(registrationError)return Response.json({error:'Unable to load registration counts.'},{status:503});
    for(const row of registrations||[]){
     const count=counts.get(row.game_id)||{registered:0,paid:0};
     if(['confirmed','pending_payment','offered'].includes(row.status))count.registered++;
     if(row.payment_status==='paid'&&row.status!=='cancelled')count.paid++;
     counts.set(row.game_id,count);
    }
    if((registrations||[]).length<500)break;
    if(offset===99500)return Response.json({error:'Registration count limit exceeded.'},{status:503});
   }
  }
  return Response.json({games:(data||[]).map(game=>({...game,
   registered_count:counts.get(game.id)?.registered||0,
   paid_count:counts.get(game.id)?.paid||0
  }))},{headers:{'Cache-Control':'private, no-store'}});
 }catch {return Response.json({error:'Unable to load games.'},{status:500});}
}

// Interpret calendar dates in New York time so weekly games stay at the
// same wall-clock time when daylight saving time changes.
function newYorkOffset(utcMs: number): number {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',
  second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(utcMs));
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),
  Number(p.hour),Number(p.minute),Number(p.second))-utcMs;
}
function newYorkInstant(local: string): Date | null {
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
 if(!match) return null;
 const [y,m,d,h,min]=match.slice(1).map(Number);
 const naive=Date.UTC(y,m-1,d,h,min);
 const check=new Date(naive);
 if(check.getUTCFullYear()!==y || check.getUTCMonth()!==m-1 ||
    check.getUTCDate()!==d || h>23 || min>59) return null;
 let utc=naive-newYorkOffset(naive);
 utc=naive-newYorkOffset(utc);
 const actual=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/New_York',
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',
  hourCycle:'h23'}).format(new Date(utc)).replace(' ','T');
 return actual===local?new Date(utc):null;
}
function nextWeek(local:string,week:number):string {
 const [date,time]=local.split('T');
 const [y,m,d]=date.split('-').map(Number);
 const shifted=new Date(Date.UTC(y,m-1,d+week*7));
 return shifted.toISOString().slice(0,10)+'T'+time;
}

export async function POST(request: Request) {
 try {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return Response.json({error:'Sign in required.'},{status:401});
  const url=process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey=process.env.SUPABASE_SECRET_KEY;
  if (!url || !publicKey || !secretKey) return Response.json({error:'Server configuration unavailable.'},{status:500});
  const auth=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if (authError || !user || !user.email_confirmed_at) return Response.json({error:'Unauthorized.'},{status:401});
  const admin=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:role,error:roleError}=await admin.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if (roleError) return Response.json({error:'Access check unavailable.'},{status:500});
  if (!role) return Response.json({error:'Administrator access required.'},{status:403});
  const body=await request.json();
  const title=typeof body.title==='string'?body.title.trim():'';
  const venue=typeof body.venue==='string'?body.venue.trim():'';
  const weeks=body.repeat_weekly===true?body.weeks:1;
  if(!Number.isInteger(weeks) || weeks<1 || weeks>16 || (body.repeat_weekly===true && weeks<2))
    return Response.json({error:'Choose 2 to 16 weeks.'},{status:400});
  const recurring=weeks>1;
  const start=recurring?newYorkInstant(body.local_start):typeof body.starts_at==='string'?new Date(body.starts_at):new Date(NaN);
  const end=recurring?newYorkInstant(body.local_end):typeof body.ends_at==='string'?new Date(body.ends_at):new Date(NaN);
  const price=body.price_cents;
  const capacity=body.capacity;
  if(title.length<3 || title.length>120 || venue.length<3 || venue.length>200 ||
     !start || !end || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
     start.getTime()<=Date.now() || end.getTime()<=start.getTime() ||
     !Number.isInteger(price) || price<0 || price>100000 ||
     !Number.isInteger(capacity) || capacity<2 || capacity>100)
     return Response.json({error:'Check the game details and try again.'},{status:400});
  const seriesId=recurring?crypto.randomUUID():null;
  const durationMinutes=(end.getTime()-start.getTime())/60000;
  if(recurring && (durationMinutes>1440 || !body.local_start || !body.local_end ||
      body.local_start.slice(0,10)!==body.local_end.slice(0,10)))
    return Response.json({error:'Recurring games must start and end on the same date.'},{status:400});
  const rows=[];
  for(let i=0;i<weeks;i++){
    const begins=recurring?newYorkInstant(nextWeek(body.local_start,i)):start;
    const finishes=recurring?newYorkInstant(nextWeek(body.local_end,i)):end;
    if(!begins || !finishes || finishes<=begins)
      return Response.json({error:'One of the weekly dates is invalid.'},{status:400});
    rows.push({
      title,venue,starts_at:begins.toISOString(),ends_at:finishes.toISOString(),
      price_cents:price,capacity,status:'draft',created_by:user.id,is_test:body.is_test===true,
      ...(recurring?{series_id:seriesId,occurrence_index:i+1}:{})
    });
  }
  const {data,error}=await admin.from('pickup_games').insert(rows)
    .select('id,title,status,starts_at,series_id,occurrence_index');
  if(error){
    console.error('Game draft creation failed',{code:error.code,message:error.message});
    return Response.json({error:'Unable to save game drafts. Check that the recurring games SQL migration has been run.'},{status:500});
  }
  return Response.json({games:data,count:rows.length},{status:201});
 }catch(error){console.error('Game creation error:',error);return Response.json({error:'Invalid request.'},{status:400});}
}

export async function PATCH(request: Request) {
 try {
  const access=await getAdmin(request);
  if(!access.admin) return Response.json({error:'Administrator access required.'},{status:access.status || 403});
  const body=await request.json();
  const id=typeof body.id==='string'?body.id:'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
   return Response.json({error:'Invalid game ID.'},{status:400});
  if(body.action==='set_test_price'){
   // Only change the price of an existing published TEST game with no Stripe
   // checkout attempts or verified payments. Never allow real-game repricing.
   if(process.env.VERCEL_ENV!=='preview')
    return Response.json({error:'Test price editing is Preview-only.'},{status:403});
   const price=body.price_cents;
   if(!Number.isInteger(price)||price<50||price>100000)
    return Response.json({error:'Choose a test price between $0.50 and $1,000.'},{status:400});
   const {data:game,error:lookupError}=await access.admin.from('pickup_games')
    .select('id,status,is_test,starts_at').eq('id',id).maybeSingle();
   if(lookupError)return Response.json({error:'Unable to verify game.'},{status:503});
   if(!game||!game.is_test||game.status!=='published'||new Date(game.starts_at)<=new Date())
    return Response.json({error:'Only upcoming published test games can be repriced.'},{status:409});
   const {data:regs,error:regError}=await access.admin.from('pickup_registrations')
    .select('id,payment_status').eq('game_id',id);
   if(regError)return Response.json({error:'Unable to verify registrations.'},{status:503});
   if((regs||[]).some(r=>r.payment_status!=='unpaid'))
    return Response.json({error:'This game has payment activity and cannot be repriced.'},{status:409});
   const ids=(regs||[]).map(r=>r.id);
   if(ids.length){
    const {data:sessions,error:sessionsError}=await access.admin.from('pickup_stripe_checkout_sessions')
     .select('id').in('registration_id',ids).limit(1);
    if(sessionsError)return Response.json({error:'Unable to verify checkout history.'},{status:503});
    if(sessions?.length)return Response.json({error:'This game already has a checkout attempt. Create a new test game.'},{status:409});
   }
   const {data:updated,error:updateError}=await access.admin.from('pickup_games')
    .update({price_cents:price}).eq('id',id).eq('is_test',true).eq('status','published')
    .select('id').maybeSingle();
   if(updateError||!updated)return Response.json({error:'Unable to update test price.'},{status:503});
   return Response.json({updated:true});
  }
  if(body.action==='publish'||body.action==='cancel'){
   const {data:game,error:lookupError}=await access.admin.from('pickup_games')
    .select('id,status,starts_at').eq('id',id).maybeSingle();
   if(lookupError)return Response.json({error:'Unable to verify game.'},{status:500});
   if(!game)return Response.json({error:'Game not found.'},{status:404});
   const next=body.action==='publish'?'published':'cancelled';
   if(next==='published'&&(game.status!=='draft'||new Date(game.starts_at).getTime()<=Date.now()))
    return Response.json({error:'Only upcoming drafts can be published.'},{status:409});
   if(next==='cancelled'&&game.status!=='published')
    return Response.json({error:'Only published games can be cancelled.'},{status:409});
   const {data,error}=await access.admin.from('pickup_games').update({status:next})
    .eq('id',id).eq('status',game.status).select('id').maybeSingle();
   if(error)return Response.json({error:'Unable to update game status.'},{status:500});
   if(!data)return Response.json({error:'Game status changed. Refresh and retry.'},{status:409});
   if(next==='published'){
    // Durable idempotency key prevents repeat alerts for the same game.
    // No emails or SMS are sent here. Fail visibly if event recording fails.
    const {error:eventError}=await access.admin.from('notification_events').upsert({
     event_key:`game_published:${id}`,event_type:'game_published',game_id:id,
     payload:{source:'admin_publish'}
    },{onConflict:'event_key',ignoreDuplicates:true});
    if(eventError){
     console.error('Published game notification event failed',{gameId:id,code:eventError.code});
     return Response.json({status:next,notification_recorded:false,
      warning:'Game published, but notification history could not be recorded. Do not republish; contact an admin.'});
    }
    // Promptly kick the same consent-gated worker after publishing.
    // The daily Hobby cron remains a fallback; no provider call occurs unless enabled.
    if(process.env.CRON_SECRET &&
       (process.env.GAME_PUBLISHED_AUTO_EMAIL_ENABLED==='true' ||
        process.env.GAME_PUBLISHED_AUTO_SMS_ENABLED==='true')){
     const workerUrl=new URL('/api/cron/game-announcements',request.url);
     after(async()=>{
      try{
       const result=await fetch(workerUrl,{headers:{Authorization:'Bearer '+process.env.CRON_SECRET},
        cache:'no-store',signal:AbortSignal.timeout(45000)});
       if(!result.ok)console.error('Game alert worker returned',result.status);
      }catch(error){console.error('Game alert worker invocation failed',error);}
     });
    }
   }
   return Response.json({status:next,notification_recorded:next==='published'});
  }
  const title=typeof body.title==='string'?body.title.trim():'';
  const venue=typeof body.venue==='string'?body.venue.trim():'';
  const start=typeof body.starts_at==='string'?new Date(body.starts_at):new Date(NaN);
  const end=typeof body.ends_at==='string'?new Date(body.ends_at):new Date(NaN);
  const price=body.price_cents,capacity=body.capacity;
  if(title.length<3 || title.length>120 || venue.length<3 || venue.length>200 ||
   !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
   end<=start || !Number.isInteger(price) || price<0 || price>100000 ||
   !Number.isInteger(capacity) || capacity<2 || capacity>100)
   return Response.json({error:'Check the updated game details.'},{status:400});
  const {data:existing,error:findError}=await access.admin.from('pickup_games')
   .select('id,status,starts_at,price_cents').eq('id',id).maybeSingle();
  if(findError)return Response.json({error:'Unable to verify game.'},{status:503});
  if(!existing)return Response.json({error:'Game not found.'},{status:404});
  if(!['draft','published'].includes(existing.status))
   return Response.json({error:'Only draft or published games can be edited.'},{status:409});
  if(existing.status==='published'){
   if(new Date(existing.starts_at).getTime()<=Date.now()||start.getTime()<=Date.now())
    return Response.json({error:'Only upcoming published games can be edited.'},{status:409});
   const {data:registrations,error:regError}=await access.admin.from('pickup_registrations')
    .select('id,status').eq('game_id',id);
   if(regError)return Response.json({error:'Unable to verify registrations.'},{status:503});
   const rows=registrations||[];
   const occupied=rows.filter(r=>['confirmed','pending_payment','offered'].includes(r.status)).length;
   if(capacity<occupied)return Response.json({error:`Capacity cannot be below ${occupied} active registrations.`},{status:409});
   if(price!==existing.price_cents){
    if(rows.length)return Response.json({error:'Price cannot change after a registration. Existing payments must be preserved.'},{status:409});
   }
  }
  const {data,error}=await access.admin.from('pickup_games').update({
   title,venue,starts_at:start.toISOString(),ends_at:end.toISOString(),price_cents:price,capacity
  }).eq('id',id).eq('status',existing.status).select('id').maybeSingle();
  if(error) {console.error('Game update failed',{code:error.code,message:error.message});return Response.json({error:'Unable to update game.'},{status:500});}
  if(!data) return Response.json({error:'Game changed; refresh and try again.'},{status:409});
  return Response.json({updated:true});
 }catch(error) {
  console.error('Game update error',{name:error instanceof Error?error.name:'Unknown'});
  return Response.json({error:'Unable to update game.'},{status:500});
 }
}

export async function DELETE(request: Request) {
 try {
  const access=await getAdmin(request);
  if(!access.admin) return Response.json({error:'Administrator access required.'},{status:access.status||403});
  const body=await request.json();
  const id=typeof body.id==='string'?body.id:'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
   return Response.json({error:'Invalid game ID.'},{status:400});
  const {data,error}=await access.admin.from('pickup_games').delete().eq('id',id).eq('status','draft').select('id').maybeSingle();
  if(error) return Response.json({error:'Unable to delete draft.'},{status:500});
  if(!data) return Response.json({error:'Draft not found or not deletable.'},{status:409});
  return Response.json({deleted:true});
 }catch{return Response.json({error:'Unable to delete draft.'},{status:500});}
}

export async function PUT(request: Request) {
 try {
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  const access=await getAdmin(request);
  if(!access.admin||!token) return Response.json({error:'Administrator access required.'},{status:access.status||403});
  const body=await request.json();
  const id=typeof body.id==='string'?body.id:'';
  const weeks=body.weeks;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
   !Number.isInteger(weeks)||weeks<2||weeks>16)
   return Response.json({error:'Choose 2 to 16 weeks.'},{status:400});
  const {data:game,error:lookupError}=await access.admin.from('pickup_games')
   .select('id,title,venue,starts_at,ends_at,price_cents,capacity,status,series_id,created_by,is_test').eq('id',id).maybeSingle();
  if(lookupError) return Response.json({error:'Unable to load draft.'},{status:500});
  if(!game||game.status!=='draft'||game.series_id)
   return Response.json({error:'Only standalone drafts can become recurring.'},{status:409});
  const start=new Date(game.starts_at),end=new Date(game.ends_at);
  if(start.getTime()<=Date.now()||end<=start)
   return Response.json({error:'The first game must be in the future.'},{status:400});
  const parts=(date:Date)=>{
   const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
    .formatToParts(date).map(x=>[x.type,x.value]));
   return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  };
  const localStart=parts(start),localEnd=parts(end);
  if(localStart.slice(0,10)!==localEnd.slice(0,10))
   return Response.json({error:'Recurring games must start and end on the same date.'},{status:400});
  const seriesId=crypto.randomUUID();
  const rows=[];
  for(let i=1;i<weeks;i++){
   const begins=newYorkInstant(nextWeek(localStart,i));
   const finishes=newYorkInstant(nextWeek(localEnd,i));
   if(!begins||!finishes||finishes<=begins)
    return Response.json({error:'A weekly date is invalid.'},{status:400});
   rows.push({title:game.title,venue:game.venue,starts_at:begins.toISOString(),
    ends_at:finishes.toISOString(),price_cents:game.price_cents,capacity:game.capacity,
    status:'draft',created_by:game.created_by,is_test:game.is_test,series_id:seriesId,occurrence_index:i+1});
  }
  // Insert new dates first. If marking the original fails, remove inserted dates.
  const {data:inserted,error:insertError}=await access.admin.from('pickup_games')
   .insert(rows).select('id');
  if(insertError) return Response.json({error:'Unable to create recurring drafts.'},{status:500});
  const {data:original,error:updateError}=await access.admin.from('pickup_games')
   .update({series_id:seriesId,occurrence_index:1}).eq('id',id).eq('status','draft')
   .is('series_id',null).select('id').maybeSingle();
  if(updateError||!original){
   const {error:rollbackError}=await access.admin.from('pickup_games').delete()
    .eq('series_id',seriesId).eq('status','draft');
   if(rollbackError) console.error('Recurring conversion rollback failed',{seriesId,code:rollbackError.code});
   return Response.json({error:'Unable to finish conversion. Refresh the game list before retrying.'},{status:500});
  }
  return Response.json({converted:true,count:weeks,series_id:seriesId,created:inserted?.length||0});
 }catch(error){
  console.error('Recurring conversion error',{name:error instanceof Error?error.name:'Unknown'});
  return Response.json({error:'Unable to convert game.'},{status:500});
 }
}

export async function OPTIONS() {
 return new Response(null,{status:204,headers:{Allow:'GET, POST, PATCH, PUT, DELETE'}});
}
export async function HEAD() {return new Response(null,{status:200});}
