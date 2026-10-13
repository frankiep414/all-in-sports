import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
async function access(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY;
 if(!token||!url||!key||!secret)return null;
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);
 if(error||!user?.email_confirmed_at)return null;
 return {user,db:createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})};
}
export async function GET(request:Request){
 const ctx=await access(request);
 if(!ctx)return Response.json({error:'Sign in required.'},{status:401});
 const {data,error}=await ctx.db.from('player_announcement_preferences')
  .select('email_opt_in,sms_opt_in').eq('user_id',ctx.user.id).maybeSingle();
 if(error)return Response.json({error:'Preferences are not available yet.'},{status:503});
 return Response.json({email_opt_in:data?.email_opt_in===true,sms_opt_in:data?.sms_opt_in===true},
  {headers:{'Cache-Control':'no-store'}});
}
export async function PUT(request:Request){
 const ctx=await access(request);
 if(!ctx)return Response.json({error:'Sign in required.'},{status:401});
 const body=await request.json().catch(()=>({}));
 if(typeof body.email_opt_in!=='boolean'||Object.keys(body).some(k=>k!=='email_opt_in'))
  return Response.json({error:'Invalid preference update.'},{status:400});
 const {error}=await ctx.db.from('player_announcement_preferences').upsert({
  user_id:ctx.user.id,email_opt_in:body.email_opt_in,
  email_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()
 },{onConflict:'user_id'});
 if(error)return Response.json({error:'Unable to save preferences.'},{status:503});
 return Response.json({email_opt_in:body.email_opt_in});
}
