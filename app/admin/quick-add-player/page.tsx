'use client';
import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import Link from 'next/link';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabase=createClient(url,key);
export default function QuickAddPlayer(){
 const [authorized,setAuthorized]=useState(false),[loading,setLoading]=useState(true);
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true;(async()=>{try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Sign in as an administrator.');const response=await fetch('/api/admin/access',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});const result=await response.json();if(active)setAuthorized(response.ok&&result.isAdmin===true);}catch{}finally{if(active)setLoading(false);}})();return()=>{active=false}},[]);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');try{
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Admin session expired. Sign in again.');
 const response=await fetch('/api/admin/quick-add-player',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({fullName:name,email,phone})});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to add player.');
 setMessage(result.name+' saved! Player ID #'+result.playerId+'. Account activation can happen later.');setName('');setEmail('');setPhone('');
 }catch(e){setError(e instanceof Error?e.message:'Unable to add player.')}finally{setBusy(false)}}
 const inputStyle={width:'100%',padding:'16px',fontSize:18,borderRadius:12,border:'1px solid #41536a',background:'#101c2a',color:'white',boxSizing:'border-box' as const,marginTop:8};
 return <main style={{minHeight:'100dvh',background:'#06101a',color:'white',fontFamily:'Arial, sans-serif',padding:'26px 18px'}}><section style={{maxWidth:460,margin:'auto'}}>
 <Link href="/admin" style={{color:'#8ee7fa'}}>← Admin Dashboard</Link>
 <p style={{color:'#66dfff',fontWeight:800,letterSpacing:3,marginTop:30}}>ALL IN SPORTS / GAME DAY</p>
 <h1 style={{fontSize:36,marginBottom:8}}>QUICK ADD PLAYER</h1>
 <p style={{color:'#c5d3df',lineHeight:1.5}}>Save a player to our roster in under a minute. No email code, password or photo required.</p>
 {loading?<p>Checking admin access…</p>:!authorized?<p role="alert">Admin access required. <Link href="/?auth=1" style={{color:'#70e1ff'}}>Sign in</Link> and return here.</p>:<form onSubmit={submit} autoComplete="off" style={{display:'grid',gap:18,marginTop:26}}>
 <label>Full name *<input style={inputStyle} required maxLength={100} placeholder="First and last name" value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>Email *<input style={inputStyle} type="email" required maxLength={254} placeholder="player@email.com" value={email} onChange={e=>setEmail(e.target.value)} autoCapitalize="none"/></label>
 <label>Phone number *<input style={inputStyle} type="tel" required maxLength={30} placeholder="(201) 555-0123" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 <p style={{fontSize:13,color:'#afc0d1',margin:0}}>No marketing messages are enabled by this signup. The player can choose notification preferences when they activate their account later.</p>
 <button type="submit" disabled={busy} style={{padding:19,border:0,borderRadius:12,background:'#00d7f7',color:'#06101a',fontWeight:900,fontSize:20,cursor:'pointer'}}>{busy?'Saving…':'SAVE PLAYER →'}</button>
 {message&&<p role="status" style={{color:'#8bf2c2',lineHeight:1.5}}>{message}</p>}{error&&<p role="alert" style={{color:'#ffabab'}}>{error}</p>}
 <p style={{color:'#b5c4d1',fontSize:14,lineHeight:1.5}}>After saving, hand the phone to the next player. Photos are entirely optional; ask permission before taking or sharing one.</p>
 </form>}
 </section></main>;
}
