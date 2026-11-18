import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!token)return Response.json({error:'Admin sign-in required.'},{status:401});
 if(!url||!key||!secret)return Response.json({error:'Service unavailable.'},{status:503});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.email_confirmed_at)return Response.json({error:'Admin sign-in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:role,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError)return Response.json({error:'Admin verification unavailable.'},{status:503});
 if(!role)return Response.json({error:'Admin only.'},{status:403});
 const body=await request.json().catch(()=>null);
 const name=typeof body?.fullName==='string'?body.fullName.trim().replace(/\s+/g,' '):'';
 const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
 const phone=typeof body?.phone==='string'?body.phone.trim():'';
 const textClaimLink=body?.textClaimLink===true;
 if(name.length<3||name.length>100||!name.includes(' ')||/[<>\r\n]/.test(name))return Response.json({error:'Enter first and last name.'},{status:400});
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return Response.json({error:'Enter a valid email.'},{status:400});
 if(phone.replace(/\D/g,'').length<10||phone.length>30)return Response.json({error:'Enter a valid phone number.'},{status:400});
 const {data:existing,error:lookupError}=await db.from('players').select('id,full_name').ilike('email',email).maybeSingle();
 if(lookupError)return Response.json({error:'Could not check existing players.'},{status:503});
 if(existing)return Response.json({error:'A player with this email already exists.',existingPlayerId:existing.id,existingName:existing.full_name},{status:409});
 // Quick-add is a player roster record, NOT a verified auth account. Never infer marketing consent.
 const {data:player,error:insertError}=await db.from('players').insert({full_name:name,email,phone,played_before:false,sms_consent:false,consent_source:'admin_game_day_quick_add'}).select('id,full_name').single();
 if(insertError){console.error('Game day quick add failed',insertError.code);return Response.json({error:'Unable to save player. Please retry.'},{status:503});}
 const claimLink='https://www.allinsportsnj.com/?auth=1';
 // The player must verify their own email through the normal sign-in flow; this link does not authenticate anyone.
 let emailSent=false,smsSent=false;
 let emailProviderId:string|null=null,smsProviderId:string|null=null;
 const resendKey=process.env.RESEND_API_KEY;
 if(resendKey){try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json','Idempotency-Key':'game-day-claim-'+player.id},body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[email],subject:'Claim your All In Sports Player ID #'+player.id,text:'Welcome to All In Sports, '+name+'! Your Player ID is #'+player.id+'. To claim your profile, visit '+claimLink+' and sign in using this email address. You will receive a verification code to your own inbox. No action was needed at the field. This is an account activation message, not a marketing subscription.'}),signal:AbortSignal.timeout(10000)});
  emailSent=response.ok;if(response.ok){const result=await response.json();emailProviderId=result.id||null;}if(!response.ok)console.error('Quick add claim email failed',response.status);
 }catch(e){console.error('Quick add claim email unavailable',e instanceof Error?e.name:'unknown');}}
 if(textClaimLink){
  const digits=phone.replace(/\\D/g,'');const to=digits.length===10?'+1'+digits:digits.length===11&&digits.startsWith('1')?'+'+digits:null;
  if(to&&process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_PHONE_NUMBER){try{
   const twilio=(await import('twilio')).default;
   const client=twilio(process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN);
   const message=await client.messages.create({from:process.env.TWILIO_PHONE_NUMBER,to,body:'All In Sports: Your Player ID #'+player.id+' is ready. Claim your profile at '+claimLink+' using '+email+'. Reply STOP to opt out.'});smsProviderId=message.sid;smsSent=true;
  }catch(e){console.error('Quick add claim SMS unavailable',e instanceof Error?e.name:'unknown');}}
 }
 // Store provider IDs for the admin history screen; provider acceptance is not delivery.
 const entries=[{player_id:player.id,channel:'email',status:emailSent?'accepted':'failed',provider_id:emailProviderId},{player_id:player.id,channel:'sms',status:textClaimLink?(smsSent?'accepted':'failed'):'not_sent',provider_id:smsProviderId}];
 const {error:historyError}=await db.from('game_day_claim_notifications').upsert(entries,{onConflict:'player_id,channel'});
 if(historyError)console.error('Game day notification history persistence failed',historyError.code);
 return Response.json({success:true,playerId:player.id,name:player.full_name,activationPending:true,emailSent,smsSent,smsRequested:textClaimLink},{headers:{'Cache-Control':'private, no-store'}});
}
