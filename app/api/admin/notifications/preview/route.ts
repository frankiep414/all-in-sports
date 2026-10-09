import {createClient} from '@supabase/supabase-js';
import {registrationEmail} from '../../../../lib/notification-email-templates';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Admin-only email preview: no Resend call, no delivery record, no outgoing message.
export async function POST(request:Request){
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return Response.json({error:'Sign in required.'},{status:401});
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!publicKey||!secret)return Response.json({error:'Configuration unavailable.'},{status:503});
  const auth=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user?.email_confirmed_at)return Response.json({error:'Unauthorized.'},{status:401});
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:admin,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(roleError)return Response.json({error:'Access check unavailable.'},{status:503});
  if(!admin)return Response.json({error:'Admin only.'},{status:403});
  const body=await request.json();
  if(typeof body?.registration_id!=='string'||!uuid.test(body.registration_id))
   return Response.json({error:'Invalid registration.'},{status:400});
  const {data:registration,error:registrationError}=await db.from('pickup_registrations')
   .select('id,game_id,player_id,status,payment_reference').eq('id',body.registration_id).maybeSingle();
  if(registrationError||!registration)return Response.json({error:'Registration unavailable.'},{status:404});
  const {data:game,error:gameError}=await db.from('pickup_games')
   .select('title,venue,starts_at,is_test').eq('id',registration.game_id).maybeSingle();
  if(gameError||!game)return Response.json({error:'Game unavailable.'},{status:404});
  if(!game.is_test)return Response.json({error:'Preview is restricted to test-only games.'},{status:403});
  const {data:player,error:playerError}=await db.from('players')
   .select('full_name').eq('id',registration.player_id).maybeSingle();
  if(playerError)return Response.json({error:'Player unavailable.'},{status:503});
  const status=registration.status==='waitlisted'?'waitlisted':
   registration.status==='offered'?'offered':'pending_payment';
  const template=registrationEmail({
   playerName:player?.full_name||'Player',gameTitle:game.title,
   venue:game.venue,startsAt:new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York'}),
   paymentReference:registration.payment_reference||'Pending',status
  });
  return Response.json({preview_only:true,subject:template.subject,text:template.text},
   {headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Unable to preview notification.'},{status:503});}
}
