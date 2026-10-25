import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
function classify(error: {message?:string;code?:string}|null){
 if(!error)return {ok:true};
 const m=(error.message||'').toLowerCase();
 const category=/fetch failed|failed to fetch|network|enotfound|econn|timeout/.test(m)?'network':
 /invalid api key|jwt|unauthorized|authentication|401|403/.test(m)?'authentication':
 /relation|does not exist|schema cache|column/.test(m)?'schema':
 /permission|policy|row.level/.test(m)?'permissions':'other';
 return {ok:false,category,code:error.code||null};
}
export async function GET(){
 if(process.env.VERCEL_ENV!=='preview'||
 process.env.SUPABASE_URL!=='https://xnrlpaqyhjzagfteatji.supabase.co'||
 !process.env.SUPABASE_SECRET_KEY)return Response.json({error:'Unavailable'},{status:404});
 const key=process.env.SUPABASE_SECRET_KEY;
 const keyShape=key.startsWith('sb_secret_')?'secret':key.split('.').length===3?'jwt':'other';
 const db=createClient(process.env.SUPABASE_URL,key,
 {auth:{persistSession:false,autoRefreshToken:false}});
 const id='b96b1b29-4a1f-4e7e-ae2c-a923a656364e';
 const {data:game,error:gameError}=await db.from('pickup_games')
 .select('id,status,is_test,starts_at').eq('id',id).maybeSingle();
 const {data:event,error:eventError}=await db.from('notification_events')
 .select('id,created_at').eq('event_key','game_published:'+id).maybeSingle();
 return Response.json({
  keyShape,gameLookup:{...classify(gameError),found:!!game},
  eventLookup:{...classify(eventError),found:!!event},
  game:game?{status:game.status,is_test:game.is_test,startFuture:new Date(game.starts_at)>new Date()}:null,
  eventAfterActivation:!!event&&!!process.env.GAME_ALERTS_NOT_BEFORE&&new Date(event.created_at)>=new Date(process.env.GAME_ALERTS_NOT_BEFORE)
 },{headers:{'Cache-Control':'no-store'}});
}
