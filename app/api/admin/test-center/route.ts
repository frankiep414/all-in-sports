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
