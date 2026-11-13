import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(){
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)return Response.json({error:'Stats unavailable'},{status:503});
 try{
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:sessions,error}=await db.from('player_air_sessions').select('player_id,session_date,air_rating,rating_status,fixtures_played,goals,assists,saves,tackles,interceptions').eq('rating_status','confirmed').order('session_date',{ascending:false}).limit(10000);
  if(error)throw error;
  const ids=[...new Set((sessions||[]).map(s=>s.player_id))];
  if(!ids.length)return Response.json({leaders:[],seasons:[],source:'confirmed_air_sessions',note:'Only confirmed AIR sessions are included.'});
  const {data:players,error:playerError}=await db.from('players').select('id,full_name,player_position').in('id',ids);
  if(playerError)throw playerError;
  const names=new Map((players||[]).map(p=>[p.id,p]));
  const byPlayer=new Map<number,any>();
  for(const s of sessions||[]){
   if(!names.has(s.player_id))continue;
   const p=names.get(s.player_id);
   const row=byPlayer.get(s.player_id)||{player_id:s.player_id,name:p.full_name||'Player',position:p.player_position,appearances:0,goals:0,assists:0,saves:0,tackles:0,interceptions:0,rating_sum:0,rating_weight:0,sessions:0};
   const games=Number.isInteger(s.fixtures_played)&&s.fixtures_played>0?s.fixtures_played:0;
   row.appearances+=games;
   for(const stat of ['goals','assists','saves','tackles','interceptions'])if(Number.isInteger(s[stat])&&s[stat]>=0)row[stat]+=s[stat];
   const rating=Number(s.air_rating);
   if(Number.isFinite(rating)&&games>0){row.rating_sum+=rating*games;row.rating_weight+=games;}
   row.sessions++;
   byPlayer.set(s.player_id,row);
  }
  const leaders=[...byPlayer.values()].map(({rating_sum,rating_weight,...p})=>({...p,air_rating:rating_weight?Math.round(rating_sum/rating_weight*100)/100:null})).sort((a,b)=>b.goals-a.goals||b.assists-a.assists||a.name.localeCompare(b.name));
  return Response.json({leaders,source:'confirmed_air_sessions',note:'Career totals include confirmed AIR sessions only. Separate match-stat imports are excluded to prevent double counting. Appearances reflect recorded fixtures, not unique calendar dates.'},{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=600'}});
 }catch(e){console.error('Career leaderboard failed',e);return Response.json({error:'Unable to load career leaders'},{status:503});}
}