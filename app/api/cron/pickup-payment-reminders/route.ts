import {createClient} from '@supabase/supabase-js';
import {sendPickupTransactional} from '../../../../lib/pickup-transactional-notifications';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return Response.json({error:'Unauthorized'},{status:401});
 const now=new Date();
 const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(now));
 if(hour!==9)return Response.json({skipped:'outside 9am ET'});
 if(process.env.PICKUP_PAYMENT_REMINDERS_ENABLED!=='true')return Response.json({disabled:true});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!secret)return Response.json({error:'Configuration unavailable'},{status:503});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const {data:games,error}=await db.from('pickup_games').select('id,starts_at').gte('starts_at',now.toISOString()).lt('starts_at',new Date(now.getTime()+86400000).toISOString()).eq('status','published').eq('is_test',false).limit(50);
 if(error)return Response.json({error:'Games unavailable'},{status:503});
 let checked=0;const outcomes=[];
 for(const game of games||[]){
  const gameDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(game.starts_at));
  if(gameDay!==day)continue;
  const {data:regs,error:regError}=await db.from('pickup_registrations').select('id').eq('game_id',game.id).eq('payment_status','unpaid').in('status',['pending_payment','offered']).limit(100);
  if(regError)continue;
  for(const r of regs||[]){checked++;outcomes.push(await sendPickupTransactional(db,r.id,'payment_reminder'));if(checked>=100)break;}
  if(checked>=100)break;
 }
 return Response.json({local_date:day,checked,outcomes});
}
