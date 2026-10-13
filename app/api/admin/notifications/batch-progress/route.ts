import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(process.env.VERCEL_ENV!=='preview')return Response.json({error:'Preview only.'},{status:403});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!url||!key||!secret)return Response.json({error:'Server configuration missing.'},{status:503});
 if(!token)return Response.json({error:'Sign in required.'},{status:401});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);
 if(error||!user?.email_confirmed_at)return Response.json({error:'Sign in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:role,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError||!role)return Response.json({error:'Admin only.'},{status:403});
 const {data,error:progressError}=await db.from('announcement_batch_progress')
  .select('game_id,after_user_id,processed,sent,skipped,failed,complete,updated_at').order('updated_at',{ascending:false}).limit(500);
 if(progressError)return Response.json({error:'Unable to read batch progress.'},{status:503});
 return Response.json({progress:data||[]},{headers:{'Cache-Control':'no-store'}});
}
