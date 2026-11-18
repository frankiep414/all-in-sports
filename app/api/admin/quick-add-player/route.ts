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
 if(name.length<3||name.length>100||!name.includes(' ')||/[<>\r\n]/.test(name))return Response.json({error:'Enter first and last name.'},{status:400});
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return Response.json({error:'Enter a valid email.'},{status:400});
 if(phone.replace(/\D/g,'').length<10||phone.length>30)return Response.json({error:'Enter a valid phone number.'},{status:400});
 const {data:existing,error:lookupError}=await db.from('players').select('id,full_name').ilike('email',email).maybeSingle();
 if(lookupError)return Response.json({error:'Could not check existing players.'},{status:503});
 if(existing)return Response.json({error:'A player with this email already exists.',existingPlayerId:existing.id,existingName:existing.full_name},{status:409});
 // Quick-add is a player roster record, NOT a verified auth account. Never infer marketing consent.
 const {data:player,error:insertError}=await db.from('players').insert({full_name:name,email,phone,played_before:false,sms_consent:false,consent_source:'admin_game_day_quick_add'}).select('id,full_name').single();
 if(insertError){console.error('Game day quick add failed',insertError.code);return Response.json({error:'Unable to save player. Please retry.'},{status:503});}
 return Response.json({success:true,playerId:player.id,name:player.full_name,activationPending:true},{headers:{'Cache-Control':'private, no-store'}});
}
