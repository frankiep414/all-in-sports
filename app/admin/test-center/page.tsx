'use client';
import Link from 'next/link';
import {useState} from 'react';
import {createClient} from '@supabase/supabase-js';
type TestGame={id:string;title:string;capacity:number;occupied:number;remaining:number;solo_fits:boolean;team_fits:boolean;solo_price_cents:number;team_price_cents:number;status:string;starts_at:string};
export default function AdminTestCenter(){
 const [games,setGames]=useState<TestGame[]>([]);
 const [state,setState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
 const [message,setMessage]=useState('');
 async function load(){
  setState('loading');setMessage('');
  try{
   const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
   if(!url||!key)throw Error('Authentication configuration unavailable.');
   const client=createClient(url,key);
   const {data:{session}}=await client.auth.getSession();
   if(!session?.access_token)throw Error('Please sign in as an administrator.');
   const response=await fetch('/api/admin/test-center',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||'Unable to load test center.');
   setGames(body.games||[]);setMessage(body.warning);setState('ready');
  }catch(e){setState('error');setMessage(e instanceof Error?e.message:'Unable to load.');}
 }
 return <main style={{minHeight:'100vh',background:'#080b10',color:'#fff',padding:'clamp(24px,5vw,64px)',fontFamily:'Arial,sans-serif'}}>
  <Link href="/admin" style={{color:'#8cdaff'}}>← Admin Command Center</Link>
  <p style={{letterSpacing:3,color:'#8cdaff',marginTop:35}}>ALL IN SPORTS // ADMIN</p>
  <h1>🧪 Test Center</h1>
  <p>Private diagnostics for test-only games. No real games, registrations, payments, or notifications are modified.</p>
  <button onClick={()=>void load()} disabled={state==='loading'} style={{padding:'14px 22px',border:0,borderRadius:10,background:'#92d9ff',fontWeight:800,cursor:'pointer'}}>
   {state==='loading'?'CHECKING…':'RUN TEST-GAME CAPACITY CHECK'}
  </button>
  {message&&<p role="status" style={{marginTop:20,padding:15,background:'#25202b',borderRadius:8}}>{message}</p>}
  {state==='ready'&&(games.length===0?<p>No test games found.</p>:<div style={{display:'grid',gap:14,marginTop:24,maxWidth:850}}>
   {games.map(g=><article key={g.id} style={{border:'1px solid #3a4858',borderRadius:12,padding:20}}>
    <h2 style={{marginTop:0}}>{g.title}</h2>
    <p>Game status: {g.status} · {g.occupied} of {g.capacity} spots reserved · {g.remaining} available</p>
    <p>Individual: ${(g.solo_price_cents/100).toFixed(2)} — {g.solo_fits?'capacity available':'no capacity'}</p>
    <p>Team (5 players): ${(g.team_price_cents/100).toFixed(2)} — {g.team_fits?'capacity available':'no capacity'}</p>
    <small style={{color:'#b8c1d0'}}>Capacity and prices are calculated from current test-game data. This does not verify a Stripe transaction.</small>
   </article>)}
  </div>)}
 </main>;
}
