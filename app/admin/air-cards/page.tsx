'use client';
import {useState} from 'react';
import {createClient} from '@supabase/supabase-js';
export default function AirCardUploadPage(){
 const [playerId,setPlayerId]=useState('');
 const [date,setDate]=useState('2026-11-11');
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();if(!file)return;
  setBusy(true);setMessage('');
  try{
   const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
   if(!url||!key)throw new Error('Sign-in configuration unavailable.');
   const db=createClient(url,key);
   const {data:{session}}=await db.auth.getSession();
   if(!session?.access_token)throw new Error('Please sign in to your admin account first.');
   const body=new FormData();body.append('card',file);body.append('player_id',playerId);body.append('session_date',date);
   const response=await fetch('/api/admin/air-card-upload',{method:'POST',headers:{Authorization:'Bearer '+session.access_token},body});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Upload failed.');
   setMessage('Card published and linked successfully.');setFile(null);
   const input=document.getElementById('air-file') as HTMLInputElement|null;if(input)input.value='';
  }catch(err){setMessage(err instanceof Error?err.message:'Upload failed.');}
  finally{setBusy(false);}
 }
 return <main style={{maxWidth:560,margin:'48px auto',padding:24,fontFamily:'system-ui'}}>
 <h1>AIR player-card publisher</h1>
 <p>Admin only. Upload an approved PNG for an existing player and session. This does not change ratings.</p>
 <form onSubmit={submit} style={{display:'grid',gap:16}}>
 <label>Player ID<input required type="number" min="1" value={playerId} onChange={e=>setPlayerId(e.target.value)} style={{display:'block',padding:12,width:'100%'}}/></label>
 <label>Session date<input required type="date" value={date} onChange={e=>setDate(e.target.value)} style={{display:'block',padding:12,width:'100%'}}/></label>
 <label>Approved card PNG<input id="air-file" required type="file" accept="image/png" onChange={e=>setFile(e.target.files?.[0]||null)} style={{display:'block',padding:12,width:'100%'}}/></label>
 <button disabled={busy||!file} style={{padding:14,background:'#111827',color:'white',borderRadius:8}}>{busy?'Publishing…':'Publish player card'}</button>
 </form><p role="status">{message}</p>
 </main>;
}
