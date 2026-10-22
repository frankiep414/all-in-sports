import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(process.env.VERCEL_ENV!=='preview'||process.env.PICKUP_STRIPE_TEST_ENABLED!=='true')
  return Response.json({games:[]});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return Response.json({error:'Unauthorized'},{status:401});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key||!secret)return Response.json({error:'Configuration unavailable'},{status:503});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);
 if(error||!user?.email_confirmed_at)return Response.json({error:'Unauthorized'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:admin,error:adminError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError||!admin)return Response.json({error:'Forbidden'},{status:403});
 const {data:games,error:gameError}=await db.from('pickup_games')
  .select('id,title,venue,starts_at,ends_at,price_cents,capacity')
  .eq('status','published').eq('is_test',true).gte('starts_at',new Date().toISOString())
  .order('starts_at',{ascending:true}).limit(30);
 if(gameError)return Response.json({error:'Unavailable'},{status:503});
 const ids=(games||[]).map(g=>g.id);
 if(!ids.length)return Response.json({games:[]});
 const {data:regs,error:regError}=await db.from('pickup_registrations').select(process.env.TEAM_REGISTRATION_ENABLED==='true'?'game_id,status,spots_reserved':'game_id,status').in('game_id',ids);
 if(regError)return Response.json({error:'Unavailable'},{status:503});
 const rows=(regs||[]) as unknown as Array<{game_id:string;status:string;spots_reserved?:number}>;
 return Response.json({games:(games||[]).map(game=>{
  const active=rows.filter(r=>r.game_id===game.id&&['pending_payment','confirmed','offered'].includes(r.status)).reduce((sum,r)=>sum+(r.spots_reserved||1),0);
  const waitlist=rows.filter(r=>r.game_id===game.id&&r.status==='waitlisted').reduce((sum,r)=>sum+(r.spots_reserved||1),0);
  return {...game,registered_count:active,waitlist_count:waitlist,spots_remaining:Math.max(0,game.capacity-active)};
 })},{headers:{'Cache-Control':'no-store'}});
}
