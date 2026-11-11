import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return Response.json({error:'Sign in required.'},{status:401});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!publishable||!secret)return Response.json({error:'Server configuration unavailable.'},{status:503});
 const auth=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.email_confirmed_at)return Response.json({error:'Sign in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:admin,error:adminError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError)return Response.json({error:'Access verification unavailable.'},{status:503});
 if(!admin)return Response.json({error:'Admin access required.'},{status:403});
 const {data:games,error:gameError}=await db.from('pickup_games')
  .select('id,title,capacity,price_cents,status,is_test,starts_at')
  .eq('is_test',true).order('starts_at',{ascending:false}).limit(15);
 if(gameError)return Response.json({error:'Unable to load test games.'},{status:503});
 const ids=(games||[]).map(g=>g.id);
 const {data:registrations,error:regError}=ids.length
  ?await db.from('pickup_registrations').select('game_id,status,spots_reserved').in('game_id',ids)
  :{data:[],error:null};
 if(regError)return Response.json({error:'Unable to load test registrations.'},{status:503});
 return Response.json({mode:'read_only',stripe_test_checkout_available:false,
  warning:'Production test checkout is not yet isolated from live Stripe. This panel does not charge cards or create registrations.',
  games:(games||[]).map(g=>{
   const occupied=(registrations||[]).filter(r=>r.game_id===g.id&&['confirmed','pending_payment','offered'].includes(r.status))
    .reduce((n,r)=>n+(r.spots_reserved||1),0);
   const remaining=Math.max(0,g.capacity-occupied);
   return {...g,occupied,remaining,solo_fits:remaining>=1,team_fits:remaining>=5,
    solo_price_cents:g.price_cents,team_price_cents:g.price_cents*5};
  })},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return Response.json({error:'Sign in required.'},{status:401});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key||!secret)return Response.json({error:'Configuration unavailable.'},{status:503});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.email_confirmed_at)return Response.json({error:'Sign in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:admin,error:adminError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError)return Response.json({error:'Access verification unavailable.'},{status:503});
 if(!admin)return Response.json({error:'Admin access required.'},{status:403});
 const body=await request.json().catch(()=>null);
 const gameId=body?.game_id;
 const type=body?.registration_type;
 if(typeof gameId!=='string'||!(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(gameId))||!['solo','team'].includes(type))
  return Response.json({error:'Choose a valid test game and registration type.'},{status:400});
 const {data:game,error:gameError}=await db.from('pickup_games')
  .select('id,title,capacity,price_cents,status,is_test,starts_at').eq('id',gameId).eq('is_test',true).maybeSingle();
 if(gameError||!game)return Response.json({error:'Test game not found.'},{status:404});
 const {data:regs,error:regError}=await db.from('pickup_registrations')
  .select('status,spots_reserved').eq('game_id',game.id);
 if(regError)return Response.json({error:'Unable to calculate capacity.'},{status:503});
 const occupied=(regs||[]).filter(r=>['confirmed','pending_payment','offered'].includes(r.status))
  .reduce((sum,r)=>sum+(r.spots_reserved||1),0);
 const seats=type==='team'?5:1;
 const remaining=Math.max(0,game.capacity-occupied);
 const allowed=game.status==='published'&&new Date(game.starts_at).getTime()>Date.now()&&remaining>=seats;
 return Response.json({simulation:true,registration_type:type,seats,occupied,remaining,
  amount_cents:game.price_cents*seats,capacity_passes:remaining>=seats,
  game_open:game.status==='published'&&new Date(game.starts_at).getTime()>Date.now(),
  would_be_eligible:allowed,charged:false,registration_created:false,
  note:'Read-only simulation. No Stripe checkout or registration is created.'},
  {headers:{'Cache-Control':'no-store'}});
}
