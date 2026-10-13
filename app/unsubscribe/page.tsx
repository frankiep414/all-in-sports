'use client';
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
export default function UnsubscribePage(){
 const params=useSearchParams(),token=params.get('token')||'';
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
 async function unsubscribe(){
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/announcements/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'Unable to unsubscribe.');
   setDone(true);
  }catch(e){setError(e instanceof Error?e.message:'Unable to unsubscribe.');}
  finally{setBusy(false);}
 }
 return <main style={{minHeight:'100vh',background:'#0b0f17',color:'#f4f7ff',padding:'80px 20px',fontFamily:'Arial,sans-serif'}}>
  <section style={{maxWidth:560,margin:'auto'}}>
   <h1>All In Sports</h1><h2>Email announcement preferences</h2>
   {done?<p>You are unsubscribed from new-game announcement emails. You can opt in again from My All In.</p>:
   <><p>Stop receiving promotional game announcement emails? This will not affect essential registration messages.</p>
   {!token?<p>This unsubscribe link is invalid or incomplete.</p>:
    <button disabled={busy} onClick={unsubscribe} style={{padding:'14px 20px',borderRadius:8,background:'#b9dcff',color:'#0b0f17',border:0,fontWeight:700,cursor:'pointer'}}>
     {busy?'Updating…':'Unsubscribe from game emails'}
    </button>}
   {error&&<p role="alert" style={{color:'#ffb0a9'}}>{error}</p>}</>}
   <p style={{marginTop:32}}><a style={{color:'#b9dcff'}} href="/my-all-in">Manage preferences in My All In</a></p>
  </section>
 </main>;
}
