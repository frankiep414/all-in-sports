'use client';
import {useState} from 'react';
import {createClient} from '@supabase/supabase-js';
export default function AirCardUploadPage(){
 const [playerId,setPlayerId]=useState('');
 const [date,setDate]=useState('2026-11-17');
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [batch,setBatch]=useState<File[]>([]);
 const [results,setResults]=useState<string[]>([]);
 const [assignments,setAssignments]=useState<Record<string,string>>({});
 const [roster,setRoster]=useState<{id:number;name:string}[]>([]);
 const [published,setPublished]=useState(0);
 const normalize=(s:string)=>{const n=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^air[_ -]/,'').replace(/[_ -]mens\.png$/,'').replace(/\.png$/,'').replace(/[^a-z0-9]/g,'');return ({franciscoapollo:'franciscoapolo',josephgonzales:'josephg',bella:'bellawysocki'} as Record<string,string>)[n]||n;};
 async function token(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error('Sign-in configuration unavailable.');const db=createClient(url,key);const {data:{session}}=await db.auth.getSession();if(!session?.access_token)throw new Error('Sign in to your admin account.');return session.access_token;}
 async function loadRoster(){setMessage('');try{const t=await token();const r=await fetch('/api/admin/air-card-upload?date='+encodeURIComponent(date),{headers:{Authorization:'Bearer '+t}});const j=await r.json();if(!r.ok)throw new Error(j.error||'Roster unavailable');setRoster(j.players);setPublished(Number(j.published||0));setMessage('Roster loaded. Matches are shown below.');}catch(e){setMessage(e instanceof Error?e.message:'Roster error');}}
 async function publishBatch(){const selected=batch.map(f=>assignments[f.name]||(roster.filter(p=>normalize(p.name)===normalize(f.name)).length===1?String(roster.find(p=>normalize(p.name)===normalize(f.name))!.id):'')).filter(Boolean);if(new Set(selected).size!==selected.length){setMessage('Two cards are assigned to the same player. Correct the selections before publishing.');return;}if(!window.confirm('Publish '+selected.length+' assigned cards for '+date+'? Check each preview and player name before continuing.'))return;setBusy(true);setResults([]);const logs:string[]=[];try{const t=await token();for(const f of batch){const match=roster.filter(p=>normalize(p.name)===normalize(f.name));const chosen=assignments[f.name]|| (match.length===1?String(match[0].id):'');const target=roster.find(p=>String(p.id)===chosen);if(!target){logs.push('SKIPPED '+f.name+' — select a player first');setResults([...logs]);continue;}const form=new FormData();form.append('card',f);form.append('player_id',String(target.id));form.append('session_date',date);const r=await fetch('/api/admin/air-card-upload',{method:'POST',headers:{Authorization:'Bearer '+t},body:form});const j=await r.json();logs.push((r.ok?'PUBLISHED ':'FAILED ')+f.name+(r.ok?'':' — '+(j.error||'Upload error')));setResults([...logs]);}setPublished(old=>old+logs.filter(line=>line.startsWith('PUBLISHED ')).length);setMessage('Batch finished. Review skipped and failed entries.');}catch(e){setMessage(e instanceof Error?e.message:'Batch failed');}finally{setBusy(false);}}

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
 <label>Session date<input required type="date" value={date} onChange={e=>{setDate(e.target.value);setRoster([]);setPublished(0);setBatch([]);setAssignments({});setResults([]);setMessage('Session changed. Load the roster for this date.');}} style={{display:'block',padding:12,width:'100%'}}/></label>
 <label>Approved card PNG<input id="air-file" required type="file" accept="image/png" onChange={e=>setFile(e.target.files?.[0]||null)} style={{display:'block',padding:12,width:'100%'}}/></label>
 <button disabled={busy||!file} style={{padding:14,background:'#111827',color:'white',borderRadius:8}}>{busy?'Publishing…':'Publish player card'}</button>
 </form>
 <section style={{marginTop:36,borderTop:'1px solid #ccc',paddingTop:24,display:'grid',gap:12}}>
 <h2>Publish multiple approved cards</h2>
 <p>Select the individual PNGs from the approved archive. Named PNGs are matched automatically. For iPhone files such as IMG_9817.png, preview each card and choose the correct player from the dropdown. Unassigned cards are skipped.</p>
 <button type="button" onClick={loadRoster} disabled={busy} style={{padding:12}}>1. Load roster for {date}</button>
 <p><strong>{roster.length}</strong> website player profiles with session records; <strong>{published}</strong> cards currently linked. Publishing does not change AIR ratings.</p>
 <input type="file" accept="image/png" multiple onChange={e=>{setBatch(Array.from(e.target.files||[]));setAssignments({});setResults([]);}}/>
 <div style={{display:'grid',gap:12}}>{batch.map((f,i)=>{const auto=roster.filter(p=>normalize(p.name)===normalize(f.name));const selected=assignments[f.name]||(auto.length===1?String(auto[0].id):'');return <div key={f.name+'-'+i} style={{border:'1px solid #64748b',borderRadius:8,padding:12,display:'grid',gap:8}}><strong>{f.name}</strong><img src={URL.createObjectURL(f)} alt={'Preview '+f.name} style={{width:150,maxHeight:180,objectFit:'contain'}} onLoad={e=>URL.revokeObjectURL((e.currentTarget as HTMLImageElement).src)}/><label>Assign this card to <select value={selected} onChange={e=>setAssignments(old=>({...old,[f.name]:e.target.value}))} style={{display:'block',padding:10,width:'100%'}}><option value=''>Skip / select player</option>{roster.map(p=><option key={p.id} value={p.id}>{p.name} (#{p.id})</option>)}</select></label></div>;})}</div>
 <button type="button" disabled={busy||!roster.length||!batch.length} onClick={publishBatch} style={{padding:14,background:'#08788c',color:'white',borderRadius:8}}>{busy?'Publishing…':'2. Publish matched cards'}</button>
 <div role="status" style={{fontSize:12,maxHeight:250,overflow:'auto'}}>{results.map((line,i)=><div key={i}>{line}</div>)}</div>
 </section><p role="status">{message}</p>
 </main>;
}
