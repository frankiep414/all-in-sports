import {createClient} from '@supabase/supabase-js';
import {verifyUnsubscribeToken} from '../../../../lib/announcement-unsubscribe';
export const dynamic='force-dynamic';
// RFC 8058: GET must never change consent; only a signed, explicit POST may do so.
export async function POST(request:Request){
 const url=new URL(request.url);
 const token=url.searchParams.get('token')||'';
 const type=request.headers.get('content-type')||'';
 if(!type.toLowerCase().startsWith('application/x-www-form-urlencoded'))
  return new Response('Unsupported media type',{status:415});
 const body=await request.text();
 if(body.length>256)return new Response('Invalid request',{status:400});
 const fields=new URLSearchParams(body);
 if(fields.get('List-Unsubscribe')!=='One-Click')return new Response('Invalid request',{status:400});
 let userId:string|null;
 try{userId=verifyUnsubscribeToken(token);}catch{return new Response('Unavailable',{status:503});}
 if(!userId)return new Response('Invalid token',{status:400});
 const supabaseUrl=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!supabaseUrl||!secret)return new Response('Unavailable',{status:503});
 const db=createClient(supabaseUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const now=new Date().toISOString();
 const {error}=await db.from('player_announcement_preferences').update({
  email_opt_in:false,email_updated_at:now,updated_at:now
 }).eq('user_id',userId);
 if(error)return new Response('Unable to update preference',{status:503});
 return new Response('Unsubscribed',{status:200,headers:{'Cache-Control':'no-store'}});
}
export async function GET(){return new Response('Method not allowed',{status:405,headers:{Allow:'POST'}});}
