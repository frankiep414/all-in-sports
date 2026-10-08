import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(){
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!secret)return Response.json({error:'Games unavailable.'},{status:503});
 try{
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from('pickup_games')
   .select('id,title,venue,starts_at,ends_at,price_cents,capacity')
   .eq('status','published').gte('starts_at',new Date().toISOString())
   .order('starts_at',{ascending:true}).limit(50);
  if(error){console.error('Public game list failed',{code:error.code});return Response.json({error:'Games unavailable.'},{status:503});}
  return Response.json({games:data},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Games unavailable.'},{status:503});}
}
