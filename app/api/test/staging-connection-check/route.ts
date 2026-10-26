import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(){
 if(process.env.VERCEL_ENV!=='preview'||process.env.SUPABASE_URL!=='https://xnrlpaqyhjzaqfteatij.supabase.co'||!process.env.SUPABASE_SECRET_KEY||
 process.env.GAME_ALERTS_EMAIL_ALLOWLIST!=='francisco.x.garcia1414@gmail.com'||
 process.env.GAME_ALERTS_SMS_ALLOWLIST!=='+18622479921')return Response.json({error:'Unavailable'},{status:404});
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const id='b96b1b29-4a1f-4e7e-ae2c-a923a656364e';
 const {data:game,error:ge}=await db.from('pickup_games').select('id,status,is_test,starts_at').eq('id',id).maybeSingle();
 const {data:ev,error:ee}=await db.from('notification_events').select('id,created_at').eq('event_key','game_published:'+id).maybeSingle();
 return Response.json({game:{found:!!game,status:game?.status,is_test:game?.is_test,startFuture:game?new Date(game.starts_at)>new Date():false,errorCode:ge?.code||null,errorCategory:ge?/fetch failed/i.test(ge.message)?'network':'query':null},event:{found:!!ev,errorCode:ee?.code||null,errorCategory:ee?/fetch failed/i.test(ee.message)?'network':'query':null},activationEligible:!!ev&&!!process.env.GAME_ALERTS_NOT_BEFORE&&new Date(ev.created_at)>=new Date(process.env.GAME_ALERTS_NOT_BEFORE)},{headers:{'Cache-Control':'no-store'}});
}