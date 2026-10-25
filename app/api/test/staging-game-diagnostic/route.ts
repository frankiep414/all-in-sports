import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(){
 if(process.env.VERCEL_ENV!=='preview'||process.env.SUPABASE_URL!=='https://xnrlpaqyhjzagfteatji.supabase.co'||!process.env.SUPABASE_SECRET_KEY)return Response.json({error:'Unavailable'},{status:404});
 const target=process.env.SUPABASE_URL;
 const results:Record<string,unknown>={};
 for(const [name,url] of [['staging',target+'/rest/v1/'],['supabase_public','https://supabase.com'],['other_public','https://example.com']]){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(6000),cache:'no-store'});results[name]={reachable:true,status:response.status};}
  catch(error){results[name]={reachable:false,type:error instanceof Error?error.name:'unknown',cause:error instanceof Error&&error.cause instanceof Error?error.cause.message.slice(0,100):null};}
 }
 const db=createClient(target,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.from('pickup_games').select('id').limit(1);
 return Response.json({network:results,db:{ok:!error,category:error?/fetch failed|failed to fetch/i.test(error.message)?'network':'other':'none',found:!!data?.length}},{headers:{'Cache-Control':'no-store'}});
}
