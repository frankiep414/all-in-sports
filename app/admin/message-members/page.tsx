'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
type Counts={email_count:number;sms_count:number};
export default function MemberBroadcast(){
 const [counts,setCounts]=useState<Counts|null>(null);
 const [subject,setSubject]=useState('');
 const [message,setMessage]=useState('');
 const [email,setEmail]=useState(true);
 const [sms,setSms]=useState(true);
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState('');
 const [progress,setProgress]=useState({email:0,sms:0,failed:0,skipped:0});
 async function token(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw Error('Login configuration unavailable');
  const client=createClient(url,key);
  const {data:{session}}=await client.auth.getSession();
  if(!session?.access_token)throw Error('Please sign in to the admin dashboard');
  return session.access_token;
 }
 async function api(body?:object){
  const access=await token();
  const response=await fetch('/api/admin/member-broadcast',{method:body?'POST':'GET',
   headers:{Authorization:'Bearer '+access,...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Request failed');
  return data;
 }
 useEffect(()=>{let active=true;api().then(x=>{if(active)setCounts(x)}).catch(e=>{if(active)setResult(e.message)});return()=>{active=false}},[]);
 const valid=message.trim().length>=5&&message.trim().length<=800&&(!email||!!subject.trim())&&subject.length<=120&&(email||sms);
 async function run(action:'test'|'send'){
  if(!valid)return;
  const selected=(email?counts?.email_count||0:0)+(sms?counts?.sms_count||0:0);
  if(action==='send'&&!window.confirm('Send this announcement to up to '+selected+' opted-in email/SMS destinations? This sends REAL messages and cannot be undone.'))return;
  setBusy(true);setResult('');
  const request_id=crypto.randomUUID();
  let cursor='',totals={email:0,sms:0,failed:0,skipped:0};
  try{
   if(action==='test'){
    const response=await api({action,request_id,subject,message,email,sms});
    setResult('Test submitted to your admin contact details. Email: '+(response.email_to||'off')+'; SMS: '+(response.sms_to||'off')+'.');
   }else{
    for(let n=0;n<10000;n++){
     const response=await api({action,request_id,subject,message,email,sms,cursor,confirm:'SEND_MEMBER_BROADCAST'});
     totals={email:totals.email+response.email_sent,sms:totals.sms+response.sms_sent,
      failed:totals.failed+response.failed,skipped:totals.skipped+response.skipped};
     setProgress(totals);
     if(response.complete){setResult('Campaign complete. Provider accepted '+totals.email+' emails and '+totals.sms+' texts. Failed: '+totals.failed+'. Skipped: '+totals.skipped+'.');break;}
     if(!response.next_cursor||response.next_cursor===cursor)throw Error('Campaign stopped: cursor did not advance');
     cursor=response.next_cursor;
    }
   }
  }catch(e){setResult('Stopped: '+(e instanceof Error?e.message:'Unknown error')+'. Review delivery history before retrying.');}
  finally{setBusy(false)}
 }
 return <main style={{maxWidth:760,margin:'32px auto',padding:20,color:'#eaf3ff',fontFamily:'Arial,sans-serif'}}>
  <Link href="/admin" style={{color:'#9dd7ff'}}>← Back to Admin</Link>
  <h1>Message All Members</h1>
  <p>Send a general announcement without publishing a game. Only members who opted in to announcements and the selected channels are eligible.</p>
  <div style={{background:'#16253b',padding:18,borderRadius:12,marginBottom:20}}>
   <strong>Eligible audience</strong>
   <p>{counts?'Email: '+counts.email_count+' · SMS: '+counts.sms_count:'Loading audience…'}</p>
   <small>Counts are channel destinations, not necessarily unique members. Consent is checked again when sending.</small>
  </div>
  <label style={{display:'block',marginBottom:12}}>Email subject
   <input value={subject} onChange={e=>setSubject(e.target.value)} maxLength={120} placeholder="All In Sports announcement"
    style={{display:'block',width:'100%',padding:12,marginTop:6,color:'#101827'}}/>
  </label>
  <label style={{display:'block'}}>Your message
   <textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={800} rows={8}
    placeholder="What's happening at All In Sports?" style={{display:'block',width:'100%',padding:12,marginTop:6,color:'#101827'}}/>
  </label>
  <p>{message.length}/800 characters</p>
  <div style={{display:'flex',gap:24,margin:'18px 0'}}>
   <label><input type="checkbox" checked={email} onChange={e=>setEmail(e.target.checked)}/> Email</label>
   <label><input type="checkbox" checked={sms} onChange={e=>setSms(e.target.checked)}/> SMS</label>
  </div>
  <p style={{fontSize:13}}>Emails include unsubscribe links. Texts include STOP instructions. SMS may be split into multiple billed segments.</p>
  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
   <button disabled={!valid||busy||!counts} onClick={()=>run('test')} style={{padding:'12px 18px',cursor:'pointer'}}>Send test to myself</button>
   <button disabled={!valid||busy||!counts} onClick={()=>run('send')} style={{padding:'12px 18px',background:'#9dd7ff',color:'#091626',fontWeight:700,cursor:'pointer'}}>Send to opted-in members</button>
  </div>
  {busy&&<p>Processing… Email accepted: {progress.email}; SMS accepted: {progress.sms}; failed: {progress.failed}</p>}
  {result&&<p role="status" style={{padding:14,background:'#243b54',borderRadius:8,marginTop:16}}>{result}</p>}
 </main>;
}
