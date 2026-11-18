'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
type Member={id:string;player_id:number|null;player_name:string|null;email:string;created_at:string;email_confirmed:boolean;email_opt_in:boolean|null;sms_opt_in:boolean|null};
type Player={id:number;full_name:string;email:string;created_at:string;source:string;account_status:string;ongoing_sms_consent:boolean|null};
type Summary={total:number;email_opted_in:number;sms_opted_in:number;email_confirmed:number};
export default function MembersPage(){
 const [players,setPlayers]=useState<Player[]>([]),[members,setMembers]=useState<Member[]>([]);
 const [summary,setSummary]=useState<Summary|null>(null);
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[filter,setFilter]=useState('');
 const [view,setView]=useState<'players'|'accounts'>('players');
 const [segment,setSegment]=useState<'all'|'verified'|'email'|'sms'>('all');
 useEffect(()=>{let active=true;(async()=>{try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw Error('Authentication configuration unavailable.');
  const client=createClient(url,key);const {data:{session}}=await client.auth.getSession();
  if(!session?.access_token)throw Error('Sign in with your admin account.');
  const response=await fetch('/api/admin/members',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load members.');
  if(active){setPlayers(data.players||[]);setMembers(data.members||[]);setSummary(data.summary);}
 }catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load members.');}
 finally{if(active)setLoading(false);}})();return()=>{active=false}},[]);
 const term=filter.trim().toLowerCase();
 const shownPlayers=useMemo(()=>players.filter(p=>p.full_name?.toLowerCase().includes(term)||p.email?.toLowerCase().includes(term)||String(p.id).includes(term)),[players,term]);
 const shownMembers=useMemo(()=>members.filter(m=>(m.email.toLowerCase().includes(term)||(m.player_name||'').toLowerCase().includes(term)||(m.player_id!==null&&String(m.player_id).includes(term)))&&(segment==='all'||(segment==='verified'&&m.email_confirmed)||(segment==='email'&&m.email_opt_in)||(segment==='sms'&&m.sms_opt_in))),[members,term,segment]);
 const cell={padding:'12px 10px',borderBottom:'1px solid #293747',verticalAlign:'top' as const};
 const tab=(active:boolean)=>({padding:'13px 16px',background:active?'#223b50':'#17212e',color:'#f5f8fc',border:active?'2px solid #95d9ff':'1px solid #34475d',borderRadius:10,fontWeight:800 as const,cursor:'pointer' as const});
 return <main style={{background:'#090e15',color:'#f5f8fc',minHeight:'100vh',padding:'clamp(20px,5vw,64px)'}}>
 <div style={{maxWidth:1100,margin:'auto'}}>
 <Link href="/admin" style={{color:'#9dd9ff'}}>← Admin Dashboard</Link>
 <h1 style={{fontSize:'clamp(30px,5vw,46px)'}}>Players & Website Members</h1>
 <p style={{color:'#b6c3d3'}}>Player IDs are assigned when someone joins the roster. A website account is separate and can be claimed later.</p>
 {loading&&<p>Loading player records…</p>}{error&&<p role="alert" style={{color:'#ffb8b8'}}>{error}</p>}
 {!loading&&!error&&summary&&<>
 <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'22px 0'}}>
  <button type="button" style={tab(view==='players')} onClick={()=>setView('players')}>All Players ({players.length})</button>
  <button type="button" style={tab(view==='accounts')} onClick={()=>setView('accounts')}>Website Accounts ({members.length})</button>
 </div>
 <label htmlFor="member-filter">Search email, name, or Player ID</label>
 <input id="member-filter" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search by email, name or number" style={{display:'block',width:'100%',maxWidth:430,padding:12,margin:'10px 0 20px',borderRadius:8,border:'1px solid #53657a',background:'#14202c',color:'white'}}/>
 {view==='players'?<>
  <p style={{color:'#b6c3d3'}}>Includes Game Day Quick Add registrations, even when the player has not yet verified their email or created a website login.</p>
  <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left',minWidth:680}}>
   <thead><tr>{['Player #','Name','Email','Added','Registration','Website account'].map(h=><th key={h} style={cell}>{h}</th>)}</tr></thead>
   <tbody>{shownPlayers.map(p=><tr key={p.id}><td style={{...cell,fontWeight:800}}>#{String(p.id).padStart(4,'0')}</td><td style={cell}>{p.full_name}</td><td style={cell}>{p.email}</td><td style={cell}>{new Date(p.created_at).toLocaleDateString('en-US')}</td><td style={cell}>{p.source}</td><td style={cell}>{p.account_status}</td></tr>)}</tbody>
  </table></div>
  <p style={{color:'#b6c3d3'}}>Showing {shownPlayers.length} of {players.length} players.</p>
 </>:<>
  <p style={{color:'#b6c3d3'}}>Website logins, including people who have not created a player profile. Claim emails and one-time claim texts are separate from ongoing marketing consent.</p>
  <div style={{display:'flex',flexWrap:'wrap',gap:8,margin:'18px 0'}}>
   {([['all','All accounts',summary.total],['verified','Verified emails',summary.email_confirmed],['email','Email opt-ins',summary.email_opted_in],['sms','Text opt-ins',summary.sms_opted_in]] as const).map(([key,label,count])=><button key={key} type="button" style={tab(segment===key)} onClick={()=>setSegment(key)}>{label}: {count}</button>)}
  </div>
  <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left',minWidth:750}}>
   <thead><tr>{['Player #','Name','Email','Signed up','Verified','Email marketing','Text marketing'].map(h=><th key={h} style={cell}>{h}</th>)}</tr></thead>
   <tbody>{shownMembers.map(m=><tr key={m.id}><td style={cell}>{m.player_id!==null?'#'+String(m.player_id).padStart(4,'0'):'Not assigned'}</td><td style={cell}>{m.player_name||'—'}</td><td style={cell}>{m.email}</td><td style={cell}>{new Date(m.created_at).toLocaleDateString('en-US')}</td><td style={cell}>{m.email_confirmed?'Yes':'No'}</td><td style={cell}>{m.email_opt_in===null?'Not recorded':m.email_opt_in?'Yes':'No'}</td><td style={cell}>{m.sms_opt_in===null?'Not recorded':m.sms_opt_in?'Yes':'No'}</td></tr>)}</tbody>
  </table></div>
  <p style={{color:'#b6c3d3'}}>Showing {shownMembers.length} of {members.length} website accounts. The one-time Game Day claim text checkbox does not opt a player into ongoing messages.</p>
 </>}
 </>}
 </div></main>;
}
