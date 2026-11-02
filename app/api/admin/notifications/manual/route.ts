import {createClient} from '@supabase/supabase-js';
import twilio from 'twilio';
export const dynamic='force-dynamic';
export const maxDuration=60;

export async function POST(request:Request){
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key||!secret)return Response.json({error:'Server configuration missing.'},{status:503});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return Response.json({error:'Sign in required.'},{status:401});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await auth.auth.getUser(token);
 if(!user?.email_confirmed_at)return Response.json({error:'Sign in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(!admin)return Response.json({error:'Admin only.'},{status:403});
 const body=await request.json().catch(()=>({}));
 const gameId=typeof body.game_id==='string'?body.game_id:'';
 if(!/^[0-9a-f-]{36}$/i.test(gameId))return Response.json({error:'Invalid game.'},{status:400});
 const {data:game}=await db.from('pickup_games').select('id,title,venue,starts_at,status,is_test').eq('id',gameId).maybeSingle();
 if(!game||game.status!=='published'||new Date(game.starts_at).getTime()<=Date.now())
  return Response.json({error:'Choose an upcoming published game.'},{status:409});
 const {data:preferences,error:prefError}=await db.from('notification_preferences')
  .select('user_id,email_game_alerts,sms_opted_in,sms_game_alerts,sms_opted_out_at,phone_e164').limit(2000);
 const {data:announcements,error:announceError}=await db.from('player_announcement_preferences')
  .select('user_id,email_opt_in,sms_opt_in').limit(2000);
 if(prefError||announceError)return Response.json({error:'Unable to verify consent.'},{status:503});
 const byUser=new Map((announcements||[]).map(p=>[p.user_id,p]));
 const emailUsers=(preferences||[]).filter(p=>p.email_game_alerts&&byUser.get(p.user_id)?.email_opt_in===true);
 const smsUsers=(preferences||[]).filter(p=>p.sms_opted_in&&p.sms_game_alerts&&!p.sms_opted_out_at&&p.phone_e164?.startsWith('+')&&byUser.get(p.user_id)?.sms_opt_in===true);
 if(body.action==='preview')return Response.json({game_title:game.title,email_count:emailUsers.length,sms_count:smsUsers.length});
 if(body.action!=='send')return Response.json({error:'Unknown action.'},{status:400});
 // This route is intentionally locked until recipient verification, retries, and full
 // batch continuation are reviewed. Preview can safely operate in production.
 return Response.json({error:'Manual delivery is not enabled yet. Recipient preview is available.'},{status:409});
}
