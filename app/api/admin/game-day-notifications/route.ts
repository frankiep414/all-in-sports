import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY;
 if(!token||!url||!key||!secret)return Response.json({error:'Admin sign-in required.'},{status:401});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.email_confirmed_at)return Response.json({error:'Admin sign-in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:role,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError)return Response.json({error:'Admin verification unavailable.'},{status:503});
 if(!role)return Response.json({error:'Admin only.'},{status:403});
 const {data:players,error:playersError}=await db.from('players').select('id,full_name,created_at').eq('consent_source','admin_game_day_quick_add').order('created_at',{ascending:false}).limit(100);
 if(playersError)return Response.json({error:'Could not load players.'},{status:503});
 const ids=(players||[]).map(p=>p.id);
 const {data:notifications,error:notificationError}=ids.length?await db.from('game_day_claim_notifications').select('player_id,channel,status,provider_id,created_at').in('player_id',ids):{data:[],error:null};
 if(notificationError)return Response.json({error:'Could not load notification history.'},{status:503});
 const statuses=new Map<string,{status:string,recordedAt:string|null}>();
 await Promise.all((notifications||[]).map(async n=>{
  let status=n.status;
  if(n.provider_id&&n.channel==='email'&&process.env.RESEND_API_KEY){
   try{const response=await fetch('https://api.resend.com/emails/'+encodeURIComponent(n.provider_id),{headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY},cache:'no-store',signal:AbortSignal.timeout(4500)});
    if(response.ok){const data=await response.json();status=String(data.last_event||data.status||'accepted');}
   }catch{status=n.status;}
  }else if(n.provider_id&&n.channel==='sms'&&process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN){
   try{const twilio=(await import('twilio')).default;const client=twilio(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN);
    const msg=await client.messages(n.provider_id).fetch();status=msg.status||n.status;
   }catch{status=n.status;}
  }
  statuses.set(n.player_id+':'+n.channel,{status,recordedAt:n.created_at});
 }));
 const rows=(players||[]).map(p=>({playerId:p.id,name:p.full_name,createdAt:p.created_at,email:statuses.get(p.id+':email')||{status:'not_tracked',recordedAt:null},sms:statuses.get(p.id+':sms')||{status:'not_tracked',recordedAt:null}}));
 return Response.json({rows,notes:'Provider acceptance is not delivery. Older signups before tracking was enabled show Not tracked.'},{headers:{'Cache-Control':'private, no-store'}});
}
