import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(process.env.VERCEL_ENV!=='preview'||process.env.SUPABASE_URL!=='https://xnrlpaqyhjzaqfteatij.supabase.co'||
 process.env.GAME_ALERTS_EMAIL_ALLOWLIST!=='francisco.x.garcia1414@gmail.com'||
 process.env.GAME_ALERTS_SMS_ALLOWLIST!=='+18622479921'||
 process.env.GAME_PUBLISHED_AUTO_EMAIL_ENABLED!=='true'||process.env.GAME_PUBLISHED_AUTO_SMS_ENABLED!=='true'||
 !process.env.SUPABASE_SECRET_KEY||!process.env.CRON_SECRET)return Response.json({error:'Unavailable'},{status:404});
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const id='b96b1b29-4a1f-4e7e-ae2c-a923a656364e';
 const {data:game,error:ge}=await db.from('pickup_games').select('status,is_test,starts_at').eq('id',id).maybeSingle();
 const {data:event,error:ee}=await db.from('notification_events').select('id,created_at').eq('event_key','game_published:'+id).maybeSingle();
 if(ge||ee||!game||!event||game.status!=='published'||!game.is_test||new Date(game.starts_at)<=new Date()||
 !process.env.GAME_ALERTS_NOT_BEFORE||new Date(event.created_at)<new Date(process.env.GAME_ALERTS_NOT_BEFORE))
 return Response.json({error:'Test prerequisites failed'},{status:409});
 const response=await fetch(new URL('/api/cron/game-announcements',request.url),{headers:{Authorization:'Bearer '+process.env.CRON_SECRET},cache:'no-store',signal:AbortSignal.timeout(55000)});
 const result=await response.json().catch(()=>({error:'Invalid worker response'}));
 return Response.json({worker_status:response.status,result},{status:response.ok?200:502,headers:{'Cache-Control':'no-store'}});
}