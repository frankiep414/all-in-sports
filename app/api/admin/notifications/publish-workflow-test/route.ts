import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!token||!url||!pub||!secret)return Response.json({error:'Authentication unavailable'},{status:401});
 const auth=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);
 if(error||!user?.email_confirmed_at||!user.email)return Response.json({error:'Sign in required'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(!admin)return Response.json({error:'Admin only'},{status:403});
 const emailAllow=(process.env.GAME_ALERTS_EMAIL_ALLOWLIST||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 const smsAllow=(process.env.GAME_ALERTS_SMS_ALLOWLIST||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(emailAllow.length!==1||smsAllow.length!==1||emailAllow[0]!==user.email.toLowerCase())
  return Response.json({error:'Test requires exactly one email and one phone allowlisted, with email matching admin'},{status:403});
 const starts=new Date(Date.now()+7*86400000),ends=new Date(starts.getTime()+60*60000);
 const endpoint=new URL('/api/admin/games',request.url);
 const headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'};
 let id:string|undefined;
 try{
  const create=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({
   title:'AIS Notification Workflow TEST ONLY',venue:'Test only - no field',
   starts_at:starts.toISOString(),ends_at:ends.toISOString(),price_cents:0,capacity:2,is_test:true
  }),cache:'no-store'});
  const created=await create.json();
  if(!create.ok||!created.games?.[0]?.id)return Response.json({error:'Could not create temporary draft',detail:created.error},{status:502});
  id=created.games[0].id;
  const publish=await fetch(endpoint,{method:'PATCH',headers,body:JSON.stringify({id,action:'publish'}),cache:'no-store',signal:AbortSignal.timeout(55000)});
  const result=await publish.json();
  return Response.json({test_only:true,game_id:id,publish_http_status:publish.status,
   notification_results:result.notification_results||null,notification_sent:result.notification_sent||false,
   warning:result.warning||null,cleanup:'Cancellation attempted in finally'});
 }catch{return Response.json({error:'Publish test failed; cleanup attempted',game_id:id},{status:502});}
 finally{
  if(id){
   try{
    const {data:game}=await db.from('pickup_games').select('status').eq('id',id).maybeSingle();
    if(game?.status==='published'){
     const response=await fetch(endpoint,{method:'PATCH',headers,body:JSON.stringify({id,action:'cancel'}),cache:'no-store',signal:AbortSignal.timeout(12000)});
     if(!response.ok)console.error('Temporary test game cancellation failed',id,response.status);
    }else if(game?.status==='draft')await db.from('pickup_games').delete().eq('id',id).eq('status','draft');
   }catch{console.error('Temporary test game cleanup uncertain',id);}
  }
 }
}
