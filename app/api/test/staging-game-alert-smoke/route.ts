import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
// Temporary staging-only smoke-test trigger. Remove immediately after test.
export async function GET(request:Request){
 if(process.env.VERCEL_ENV!=='preview' ||
    process.env.SUPABASE_URL!=='https://xnrlpaqyhjzagfteatji.supabase.co' ||
    process.env.GAME_ALERTS_EMAIL_ALLOWLIST!=='francisco.x.garcia1414@gmail.com' ||
    process.env.GAME_ALERTS_SMS_ALLOWLIST!=='+18622479921' ||
    process.env.GAME_PUBLISHED_AUTO_EMAIL_ENABLED!=='true' ||
    process.env.GAME_PUBLISHED_AUTO_SMS_ENABLED!=='true' ||
    !process.env.CRON_SECRET || !process.env.SUPABASE_SECRET_KEY)
   return Response.json({error:'Staging test guard failed'},{status:403});
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,
  {auth:{persistSession:false,autoRefreshToken:false}});
 const gameId='b96b1b29-4a1f-4e7e-ae2c-a923a656364e';
 const {data:game,error}=await db.from('pickup_games').select('id,status,is_test,starts_at')
  .eq('id',gameId).maybeSingle();
 if(error||!game||game.status!=='published'||!game.is_test||
    new Date(game.starts_at)<=new Date())return Response.json({error:'Test game invalid'},{status:409});
 const {data:events,error:eventError}=await db.from('notification_events')
  .select('id').eq('event_key','game_published:'+gameId).eq('event_type','game_published').limit(1);
 if(eventError||events?.length!==1)return Response.json({error:'Test event missing'},{status:409});
 const response=await fetch(new URL('/api/cron/game-announcements',request.url),{
  headers:{Authorization:'Bearer '+process.env.CRON_SECRET},cache:'no-store',
  signal:AbortSignal.timeout(55000)});
 const result=await response.json().catch(()=>({error:'Non-JSON worker response'}));
 return Response.json({worker_status:response.status,result},{status:response.ok?200:502});
}
