import {createClient} from '@supabase/supabase-js';
import {NextResponse} from 'next/server';

export const dynamic='force-dynamic';

// Stable human-readable game links; existing UUID links remain supported.
export async function GET(request:Request,context:{params:Promise<{slug:string}>}){
 const {slug}=await context.params;
 const match=/^(mens|coed)-([a-z]{3})-(\d{1,2})(?:-(\d{4}))?$/.exec(slug);
 if(!match)return new Response('Game not found',{status:404});
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const month=months.indexOf(match[2]);
 const day=Number(match[3]);
 const year=match[4]?Number(match[4]):2026;
 if(month<0||day<1||day>31||year<2026||year>2100)return new Response('Game not found',{status:404});
 const date=new Date(Date.UTC(year,month,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month||date.getUTCDate()!==day)return new Response('Game not found',{status:404});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return new Response('Service unavailable',{status:503});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 // Query a two-day UTC window to accommodate local evening games and DST.
 const start=new Date(Date.UTC(year,month,day,0,0,0)-12*60*60*1000).toISOString();
 const end=new Date(Date.UTC(year,month,day+1,0,0,0)+12*60*60*1000).toISOString();
 const {data,error}=await db.from('pickup_games').select('id,title,starts_at').eq('status','published').gte('starts_at',start).lt('starts_at',end).limit(100);
 if(error)return new Response('Service unavailable',{status:503});
 const matching=(data||[]).filter(game=>{
  const local=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(game.starts_at));
  const target=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  const category=match[1]==='mens'?/\b(mens|men's|men)\b/i:/\b(coed|co-ed)\b/i;
  return local===target&&category.test(game.title);
 });
 // Never silently route to the wrong game when multiple games share a date/category.
 if(matching.length!==1)return new Response('Game not found',{status:404});
 const destination=new URL('/play',request.url);
 destination.searchParams.set('game',matching[0].id);
 return NextResponse.redirect(destination,307);
}
