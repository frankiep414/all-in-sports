import {createClient} from '@supabase/supabase-js';
import {verifyUnsubscribeToken} from '../../../../lib/announcement-unsubscribe';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const body=await request.json().catch(()=>({}));
 const token=typeof body.token==='string'?body.token:'';
 let userId:string|null;
 try{userId=verifyUnsubscribeToken(token);}catch{return Response.json({error:'Unsubscribe is not configured.'},{status:503});}
 if(!userId)return Response.json({error:'Invalid unsubscribe link.'},{status:400});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!secret)return Response.json({error:'Service unavailable.'},{status:503});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error}=await db.from('player_announcement_preferences').update({
  email_opt_in:false,email_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()
 }).eq('user_id',userId);
 if(error)return Response.json({error:'Unable to update preference. Please try again.'},{status:503});
 return Response.json({unsubscribed:true});
}
