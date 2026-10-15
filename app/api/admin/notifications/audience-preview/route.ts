import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
// Read-only audience audit. Never sends email or SMS.
export async function POST(request:Request){
 if(process.env.VERCEL_ENV!=='preview')return Response.json({error:'Preview only.'},{status:403});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY;
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!url||!key||!secret)return Response.json({error:'Server configuration missing.'},{status:503});
 if(!token)return Response.json({error:'Sign in required.'},{status:401});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.email_confirmed_at)return Response.json({error:'Sign in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:role,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError||!role)return Response.json({error:'Admin only.'},{status:403});
 const body=await request.json().catch(()=>({}));
 const id=typeof body.game_id==='string'?body.game_id:'';
 if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'Invalid game.'},{status:400});
 const {data:game,error:gameError}=await db.from('pickup_games').select('id,title,status,starts_at').eq('id',id).maybeSingle();
 if(gameError||!game||game.status!=='published'||new Date(game.starts_at)<=new Date())
  return Response.json({error:'Choose an upcoming published game.'},{status:409});
 const {count:optedIn,error:countError}=await db.from('player_announcement_preferences')
  .select('user_id',{count:'exact',head:true}).eq('email_opt_in',true);
 if(countError)return Response.json({error:'Consent table unavailable. Apply the migration first.'},{status:503});
 const {data:event}=await db.from('notification_events').select('id').eq('event_key','game_published:'+id).maybeSingle();
 let priorDeliveryCount=0;
 if(event){
  const {count,error}=await db.from('notification_deliveries').select('id',{count:'exact',head:true})
   .eq('event_id',event.id).eq('channel','email');
  if(error)return Response.json({error:'Unable to audit delivery history.'},{status:503});
  priorDeliveryCount=count||0;
 }
 return Response.json({game_id:id,game_title:game.title,email_opted_in_count:optedIn||0,
  prior_email_delivery_records:priorDeliveryCount,sending_enabled:false,
  note:'Audit only. No messages were sent. Consent and suppression must be checked again at send time.'});
}
