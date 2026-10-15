'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
type Member={id:string;player_id:number|null;player_name:string|null;email:string;created_at:string;email_confirmed:boolean;email_opt_in:boolean|null;sms_opt_in:boolean|null};
type Summary={total:number;email_opted_in:number;sms_opted_in:number;email_confirmed:number};
export default function MembersPage(){
 const [members,setMembers]=useState<Member[]>([]);
 const [summary,setSummary]=useState<Summary|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [filter,setFilter]=useState('');
 const [segment,setSegment]=useState<'all'|'verified'|'email'|'sms'>('all');
 useEffect(()=>{let active=true;(async()=>{
  try{
   const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
   if(!url||!key)throw Error('Authentication configuration unavailable.');
   const client=createClient(url,key);
   const {data:{session}}=await client.auth.getSession();
   if(!session?.access_token)throw Error('Sign in with your admin account.');
   const response=await fetch('/api/admin/members',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Unable to load members.');
   if(active){setMembers(data.members);setSummary(data.summary);}
  }catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load members.');}
  finally{if(active)setLoading(false);}
 })();return()=>{active=false;};},[]);
 const filtered=members.filter(m=>(m.email.toLowerCase().includes(filter.toLowerCase())||(m.player_name||'').toLowerCase().includes(filter.toLowerCase())||(m.player_id!==null&&String(m.player_id).includes(filter)))&&
  (segment==='all'||(segment==='verified'&&m.email_confirmed)||(segment==='email'&&m.email_opt_in)||(segment==='sms'&&m.sms_opt_in)));
 return <main style={{background:'#090e15',color:'#f5f8fc',minHeight:'100vh',padding:'clamp(20px,5vw,64px)'}}>
  <div style={{maxWidth:1100,margin:'auto'}}>
   <Link href="/admin" style={{color:'#9dd9ff'}}>← Admin Dashboard</Link>
   <h1 style={{fontSize:'clamp(30px,5vw,46px)'}}>Website Members</h1>
   <p style={{color:'#b6c3d3'}}>Every website account, including members who have not joined a game. Announcement opt-ins are shown separately.</p>
   {loading&&<p>Loading website members…</p>}
   {error&&<p role="alert" style={{color:'#ffb8b8'}}>{error}</p>}
   {summary&&<>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,margin:'24px 0'}}>
     {([['all','Website signups',summary.total],['verified','Verified emails',summary.email_confirmed],['email','Email opt-ins',summary.email_opted_in],['sms','Text opt-ins',summary.sms_opted_in]] as const).map(([key,label,value])=>
      <button type="button" key={key} onClick={()=>setSegment(key)} aria-pressed={segment===key}
       style={{background:segment===key?'#223b50':'#17212e',border:segment===key?'2px solid #95d9ff':'1px solid #34475d',
        borderRadius:12,padding:20,textAlign:'left',color:'#f5f8fc',cursor:'pointer'}}>
       <div style={{fontSize:32,fontWeight:800}}>{value}</div><div style={{color:'#b6c3d3'}}>{label}</div>
       <div style={{color:'#95d9ff',fontSize:12,marginTop:8}}>{segment===key?'Showing below':'Click to view members'}</div>
      </button>)}
    </div>
    <p style={{color:'#b6c3d3'}}>Text consent is read from the original player signup where available. Not recorded means we cannot verify a choice. SMS delivery is not active; payment emails are separate.</p>
    <label htmlFor="member-filter">Search email, name, or Player ID</label>
    <input id="member-filter" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search by email, name or number" style={{display:'block',width:'100%',maxWidth:430,padding:12,margin:'10px 0 20px',borderRadius:8,border:'1px solid #53657a',background:'#14202c',color:'white'}}/>
    <div style={{overflowX:'auto'}}>
     <table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}>
      <thead><tr>{['Player #','Name','Email','Signed up','Verified','Email opt-in','Text opt-in'].map(h=><th key={h} style={{padding:12,borderBottom:'1px solid #526071'}}>{h}</th>)}</tr></thead>
      <tbody>{filtered.map(m=><tr key={m.id}>
       <td style={{padding:12,borderBottom:'1px solid #293747',fontWeight:700}}>{m.player_id!==null?'#'+String(m.player_id).padStart(4,'0'):'Not assigned'}</td>
       <td style={{padding:12,borderBottom:'1px solid #293747'}}>{m.player_name||'—'}</td>
       <td style={{padding:12,borderBottom:'1px solid #293747'}}>{m.email||'No email'}</td>
       <td style={{padding:12,borderBottom:'1px solid #293747'}}>{new Date(m.created_at).toLocaleDateString('en-US')}</td>
       <td style={{padding:12,borderBottom:'1px solid #293747'}}>{m.email_confirmed?'Yes':'No'}</td>
       <td style={{padding:12,borderBottom:'1px solid #293747'}}>{m.email_opt_in===null?'Not recorded':m.email_opt_in?'Yes':'No'}</td>
       <td style={{padding:12,borderBottom:'1px solid #293747'}}>{m.sms_opt_in===null?'Not recorded':m.sms_opt_in?'Yes':'No'}</td>
      </tr>)}</tbody>
     </table>
    </div>
    <p style={{color:'#b6c3d3'}}>Showing {filtered.length} of {members.length} website accounts. {segment!=='all'?'Click Website signups to clear the opt-in filter.':''}</p>
   </>}
  </div>
 </main>;
}
