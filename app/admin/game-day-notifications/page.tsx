'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '@supabase/supabase-js';
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
type Status={status:string;recordedAt:string|null};
type Row={playerId:number;name:string;createdAt:string;email:Status;sms:Status};
function display(status:string){const names:Record<string,string>={not_tracked:'Not tracked',not_sent:'Not requested',accepted:'Accepted by provider',delivered:'Delivered',sent:'Sent',queued:'Queued',failed:'Failed',bounced:'Bounced',complained:'Spam complaint',undelivered:'Undelivered',received:'Received'};return names[status]||status.replaceAll('_',' ');}
export default function History(){
 const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(){setLoading(true);setError('');try{
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Sign in as an admin first.');
  const response=await fetch('/api/admin/game-day-notifications',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Could not load history.');
  setRows(result.rows);
 }catch(e){setError(e instanceof Error?e.message:'Unable to load history.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 return <main style={{background:'#06101a',color:'white',minHeight:'100dvh',padding:'24px 16px',fontFamily:'Arial,sans-serif'}}><section style={{maxWidth:860,margin:'auto'}}>
 <Link href="/admin" style={{color:'#7be5f7'}}>← Admin Dashboard</Link>
 <p style={{color:'#60d9f1',fontWeight:800,letterSpacing:2,marginTop:30}}>ALL IN SPORTS / ADMIN</p><h1>Game Day Notification History</h1>
 <p style={{color:'#bacbd7',lineHeight:1.5}}>Claim emails and optional texts for Quick Add players. Statuses refresh from Resend and Twilio when available. Provider acceptance does not guarantee delivery.</p>
 <button onClick={()=>void load()} disabled={loading} style={{background:'#00d7f7',color:'#06101a',padding:'12px 18px',border:0,borderRadius:10,fontWeight:800}}>{loading?'Checking…':'Refresh statuses'}</button>
 {error&&<p role="alert" style={{color:'#ffaaa9'}}>{error}</p>}
 {!loading&&!error&&rows.length===0&&<p>No game-day signups found.</p>}
 <div style={{display:'grid',gap:14,marginTop:22}}>{rows.map(r=><article key={r.playerId} style={{border:'1px solid #33485b',borderRadius:14,padding:18,background:'#101e2c'}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong>{r.name} · #{r.playerId}</strong><small style={{color:'#aabcc9'}}>{new Date(r.createdAt).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'})} ET</small></div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,marginTop:14}}>
 <div><span style={{color:'#aabcc9'}}>✉ Claim email</span><p style={{margin:'5px 0',fontWeight:800}}>{display(r.email.status)}</p></div>
 <div><span style={{color:'#aabcc9'}}>📱 Claim text</span><p style={{margin:'5px 0',fontWeight:800}}>{display(r.sms.status)}</p></div>
 </div></article>)}</div>
 <p style={{color:'#aabcc9',fontSize:13,marginTop:20}}>Historical registrations made before notification tracking was enabled show “Not tracked,” not “Not sent.” SMS is optional and only sent when the player agrees.</p>
 </section></main>;
}
