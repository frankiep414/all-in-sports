import {createClient} from '@supabase/supabase-js';
import {GET as runAnnouncementWorker} from '../../cron/game-announcements/route';
export const dynamic='force-dynamic';

// Admin-authenticated Preview-only trigger. Uses the existing consent, allowlist,
// idempotency and delivery logic rather than creating a second sending path.
export async function POST(request:Request){
 if(process.env.VERCEL_ENV!=='preview')return Response.json({error:'Not found'},{status:404});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return Response.json({error:'Sign in required'},{status:401});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 const cronSecret=process.env.CRON_SECRET;
 if(!url||!key||!secret||!cronSecret)return Response.json({error:'Preview configuration incomplete'},{status:503});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.email_confirmed_at)return Response.json({error:'Unauthorized'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:admin,error:adminError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError)return Response.json({error:'Admin check unavailable'},{status:503});
 if(!admin)return Response.json({error:'Administrator access required'},{status:403});
 const workerRequest=new Request(new URL('/api/cron/game-announcements',request.url),{
  method:'GET',headers:{authorization:'Bearer '+cronSecret}
 });
 return runAnnouncementWorker(workerRequest);
}
