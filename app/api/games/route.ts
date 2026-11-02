import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(){
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!secret)return Response.json({error:'Games unavailable.'},{status:503});
 try{
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from('pickup_games')
   .select('id,title,venue,starts_at,ends_at,price_cents,capacity')
   .eq('status','published').eq('is_test',false).gte('starts_at',new Date().toISOString())
   .order('starts_at',{ascending:true}).limit(50);
  if(error){console.error('Public game list failed',{code:error.code,message:error.message,details:error.details,hint:error.hint});return Response.json({error:'Games unavailable.'},{status:503});}
  const games=data||[];
  if(games.length===0)return Response.json({games:[]},{headers:{'Cache-Control':'no-store'}});
  const {data:registrations,error:registrationError}=await db.from('pickup_registrations')
   .select(process.env.TEAM_REGISTRATION_ENABLED==='true'?'game_id,status,spots_reserved':'game_id,status').in('game_id',games.map(game=>game.id)).limit(10000);
  if(registrationError){
   console.error('Public availability lookup failed',{code:registrationError.code});
   return Response.json({error:'Game availability unavailable.'},{status:503});
  }
  type SeatRow={game_id:string;status:string;spots_reserved?:number};
  const rows=(registrations||[]) as unknown as SeatRow[];
  const totals=new Map<string,{registered:number;waitlisted:number}>();
  for(const registration of rows){
   const total=totals.get(registration.game_id)||{registered:0,waitlisted:0};
   if(['confirmed','pending_payment','offered'].includes(registration.status))total.registered+=registration.spots_reserved||1;
   if(registration.status==='waitlisted')total.waitlisted+=registration.spots_reserved||1;
   totals.set(registration.game_id,total);
  }
  return Response.json({games:games.map(game=>{
   const count=totals.get(game.id)||{registered:0,waitlisted:0};
   return {...game,registered_count:count.registered,waitlist_count:count.waitlisted,
    spots_remaining:Math.max(0,game.capacity-count.registered)};
  })},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Games unavailable.'},{status:503});}
}
