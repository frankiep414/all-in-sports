import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!token)return Response.json({error:'Sign in required.'},{status:401});
 if(!url||!key||!secret)return Response.json({error:'Configuration unavailable.'},{status:503});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.email_confirmed_at)return Response.json({error:'Sign in required.'},{status:401});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:role,error:roleError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError)return Response.json({error:'Admin verification unavailable.'},{status:503});
 if(!role)return Response.json({error:'Admin only.'},{status:403});
 try{
  const users:Array<{id:string;email:string;created_at:string;email_confirmed:boolean}>=[];
  for(let page=1;page<=100;page++){
   const {data,error}=await db.auth.admin.listUsers({page,perPage:100});
   if(error)throw Error('Unable to read website accounts.');
   for(const item of data.users){
    users.push({id:item.id,email:item.email||'',created_at:item.created_at,
     email_confirmed:Boolean(item.email_confirmed_at)});
   }
   if(data.users.length<100)break;
   if(page===100)throw Error('Member list is too large to display completely.');
  }
  const preferenceMap=new Map<string,{email_opt_in:boolean;sms_opt_in:boolean}>();
  for(let i=0;i<users.length;i+=100){
   const ids=users.slice(i,i+100).map(u=>u.id);
   if(!ids.length)continue;
   const {data,error}=await db.from('player_announcement_preferences')
    .select('user_id,email_opt_in,sms_opt_in').in('user_id',ids);
   if(error)throw Error('Unable to read consent preferences.');
   for(const row of data||[])preferenceMap.set(row.user_id,{
    email_opt_in:row.email_opt_in===true,sms_opt_in:row.sms_opt_in===true
   });
  }
  const playerMap=new Map<string,{id:number;full_name:string;sms_consent:boolean|null}>();
  for(let i=0;i<users.length;i+=100){
   const emails=users.slice(i,i+100).map(u=>u.email).filter(Boolean);
   if(!emails.length)continue;
   const {data,error}=await db.from('players').select('id,full_name,email,sms_consent').in('email',emails);
   if(error)throw Error('Unable to read Player IDs.');
   for(const player of data||[])if(typeof player.email==='string'){
    playerMap.set(player.email.toLowerCase(),{id:player.id,full_name:player.full_name||'',sms_consent:typeof player.sms_consent==='boolean'?player.sms_consent:null});
   }
  }
  const members=users.map(u=>({...u,player_id:playerMap.get(u.email.toLowerCase())?.id??null,player_name:playerMap.get(u.email.toLowerCase())?.full_name??null,email_opt_in:preferenceMap.has(u.id)?preferenceMap.get(u.id)!.email_opt_in:null,
   sms_opt_in:playerMap.get(u.email.toLowerCase())?.sms_consent??(preferenceMap.has(u.id)?preferenceMap.get(u.id)!.sms_opt_in:null)}));
  // All roster players are included even if they have not claimed a website login.
  const allPlayers:Array<{id:number;full_name:string;email:string;created_at:string;consent_source:string|null;sms_consent:boolean|null}>=[];
  for(let start=0;start<10000;start+=500){
   const {data,error}=await db.from('players').select('id,full_name,email,created_at,consent_source,sms_consent').order('id',{ascending:false}).range(start,start+499);
   if(error)throw Error('Unable to read player roster.');
   allPlayers.push(...(data||[]));
   if((data||[]).length<500)break;
   if(start===9500)throw Error('Player roster too large to display completely.');
  }
  const accountByEmail=new Map(users.filter(u=>u.email).map(u=>[u.email.toLowerCase(),u]));
  const players=allPlayers.map(p=>{
   const account=accountByEmail.get((p.email||'').toLowerCase());
   return {id:p.id,full_name:p.full_name,email:p.email,created_at:p.created_at,
    source:p.consent_source==='admin_game_day_quick_add'?'Game Day Quick Add':'Website / other',
    account_status:!account?'No website account':account.email_confirmed?'Verified account':'Unverified account',
    // Quick Add sms_consent=false is not proof of declining the one-time claim SMS.
    ongoing_sms_consent:p.consent_source==='admin_game_day_quick_add'?null:p.sms_consent};
  });
  members.sort((a,b)=>b.created_at.localeCompare(a.created_at));
  return Response.json({players,members,summary:{
   total:members.length,email_opted_in:members.filter(m=>m.email_opt_in).length,
   sms_opted_in:members.filter(m=>m.sms_opt_in).length,
   email_confirmed:members.filter(m=>m.email_confirmed).length
  },note:'Text consent comes from original player signup records where available; missing consent is not treated as No. Email announcement consent is separate. SMS sending is not enabled.'},
   {headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('Member report failed',{message:error instanceof Error?error.message:'unknown'});
  return Response.json({error:'Unable to load complete member and consent records.'},{status:503});
 }
}
