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
    .select('id,title,venue,starts_at,ends_at,price_cents,capacity,status,created_at')
    .order('starts_at',{ascending:true}).limit(100);
  if(error) return Response.json({error:'Unable to load games.'},{status:500});
  return Response.json({games:data});
 }catch {return Response.json({error:'Unable to load games.'},{status:500});}
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
  const start=typeof body.starts_at==='string'?new Date(body.starts_at):new Date(NaN);
  const end=typeof body.ends_at==='string'?new Date(body.ends_at):new Date(NaN);
  const price=body.price_cents;
  const capacity=body.capacity;
  if(title.length<3 || title.length>120 || venue.length<3 || venue.length>200 ||
     !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
     start.getTime()<=Date.now() || end.getTime()<=start.getTime() ||
     !Number.isInteger(price) || price<0 || price>100000 ||
     !Number.isInteger(capacity) || capacity<2 || capacity>100)
     return Response.json({error:'Check the game details and try again.'},{status:400});
  const {data,error}=await admin.from('pickup_games').insert({
   title,venue,starts_at:start.toISOString(),ends_at:end.toISOString(),
   price_cents:price,capacity,status:'draft',created_by:user.id
  }).select('id,title,status').single();
  if(error){console.error('Game draft creation failed:',error);return Response.json({error:'Unable to save game draft.'},{status:500});}
  return Response.json({game:data},{status:201});
 }catch(error){console.error('Game creation error:',error);return Response.json({error:'Invalid request.'},{status:400});}
}
