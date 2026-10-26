'use client';
import {useState} from 'react';
import {createClient} from '@supabase/supabase-js';

export default function PreviewAnnouncementTest(){
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState('');
 async function run(){
  if(busy)return;
  if(!window.confirm('Run the Preview notification worker now? Only allowlisted, opted-in recipients can receive notifications for eligible staging events.'))return;
  setBusy(true);setResult('');
  try{
   const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
   const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
   if(!url||!key)throw new Error('Preview sign-in is unavailable.');
   const client=createClient(url,key);
   const {data:{session}}=await client.auth.getSession();
   if(!session?.access_token)throw new Error('Sign in as an administrator on this Preview site first.');
   const response=await fetch('/api/admin/preview-game-announcements',{method:'POST',headers:{Authorization:'Bearer '+session.access_token}});
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(payload.error||'The test could not run.');
   setResult(JSON.stringify(payload,null,2));
  }catch(e){setResult(e instanceof Error?e.message:'Test unavailable');}
  finally{setBusy(false);}
 }
 return <main style={{minHeight:'100vh',background:'#0b1018',color:'#f4f7fb',fontFamily:'Arial,sans-serif',padding:'64px 20px'}}>
  <section style={{maxWidth:580,margin:'auto'}}>
   <h1>All In Sports</h1><h2>Preview notification test</h2>
   <p>This page works only in Preview. The server requires an authenticated administrator and the existing worker checks opt-in, allowlists, and duplicate deliveries.</p>
   <p>No message is sent unless there is a qualifying staging event that has not already been delivered.</p>
   <button onClick={run} disabled={busy} style={{background:'#38a9ff',color:'#07101b',padding:'15px 24px',border:0,borderRadius:9,fontWeight:700}}>{busy?'Running…':'Run staging notification test'}</button>
   {result&&<pre role="status" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',padding:20,background:'#172434',borderRadius:10,marginTop:24}}>{result}</pre>}
  </section>
 </main>;
}
