import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(){
 if(process.env.VERCEL_ENV!=='preview'||
 process.env.SUPABASE_URL!=='https://xnrlpaqyhjzagfteatji.supabase.co'||
 !process.env.SUPABASE_SECRET_KEY)return Response.json({error:'Unavailable'},{status:404});
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,
 {auth:{persistSession:false,autoRefreshToken:false}});
 const id='b96b1b29-4a1f-4e7e-ae2c-a923a656364e';
 const {data:game,error:gameError}=await db.from('pickup_games')
 .select('id,status,is_test,starts_at').eq('id',id).maybeSingle();
 const {data:event,error:eventError}=await db.from('notification_events')
 .select('id,created_at').eq('event_key','game_published:'+id).maybeSingle();
 return Response.json({
  dbLookup:gameError?{ok:false,code:gameError.code}:{ok:true,found:!!game},
  game:game?{status:game.status,is_test:game.is_test,startFuture:new Date(game.starts_at)>new Date()}:null,
  eventLookup:eventError?{ok:false,code:eventError.code}:{ok:true,found:!!event},
  eventAfterActivation:!!event&&!!process.env.GAME_ALERTS_NOT_BEFORE&&new Date(event.created_at)>=new Date(process.env.GAME_ALERTS_NOT_BEFORE),
  emailEnabled:process.env.GAME_PUBLISHED_AUTO_EMAIL_ENABLED==='true',
  smsEnabled:process.env.GAME_PUBLISHED_AUTO_SMS_ENABLED==='true'
 },{headers:{'Cache-Control':'no-store'}});
}
