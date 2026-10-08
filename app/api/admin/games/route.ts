import { createClient } from '@supabase/supabase-js';

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
    .select('id,title,venue,starts_at,ends_at,price_cents,capacity,status,created_at,series_id,occurrence_index')
    .order('starts_at',{ascending:true}).limit(100);
  if(error) return Response.json({error:'Unable to load games.'},{status:500});
  return Response.json({games:data});
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
 const match=/^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})$/.exec(local);
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
      price_cents:price,capacity,status:'draft',created_by:user.id,
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
