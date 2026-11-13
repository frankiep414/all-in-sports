'use client';
import {useEffect,useMemo,useState} from 'react';
type Player={player_id:number;name:string;position:string|null;appearances:number;goals:number;assists:number;saves:number;tackles:number;interceptions:number;air_rating:number|null;sessions:number};
const categories=[['goals','Goals'],['assists','Assists'],['appearances','Appearances'],['saves','Saves'],['tackles','Tackles'],['interceptions','Interceptions'],['air_rating','AIR Rating']] as const;
export default function CareerLeaders(){
 const [players,setPlayers]=useState<Player[]>([]),[metric,setMetric]=useState<keyof Player>('goals'),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{fetch('/api/leaderboards/career').then(async r=>{if(!r.ok)throw Error('Could not load standings');return r.json()}).then(d=>setPlayers(d.leaders||[])).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 const sorted=useMemo(()=>[...players].filter(p=>metric!=='air_rating'||p.air_rating!==null).sort((a,b)=>Number(b[metric]||0)-Number(a[metric]||0)||b.goals-a.goals||a.name.localeCompare(b.name)),[players,metric]);
 return <main style={{minHeight:'100vh',background:'#091323',color:'#fff',padding:'48px 20px'}}>
  <div style={{maxWidth:960,margin:'0 auto'}}>
   <a href="/" style={{color:'#93c5fd'}}>← All In Sports</a>
   <p style={{letterSpacing:3,color:'#fbbf24',marginTop:32}}>ALL IN SPORTS</p>
   <h1 style={{fontSize:'clamp(2rem,6vw,3.5rem)',fontWeight:900,margin:'8px 0'}}>Career Leaderboards</h1>
   <p style={{color:'#cbd5e1',marginBottom:28}}>The all-time record book. Every confirmed AIR session adds to a player's career.</p>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:24}}>{categories.map(([key,label])=><button key={key} onClick={()=>setMetric(key)} style={{padding:'10px 15px',borderRadius:999,border:'1px solid #334155',background:metric===key?'#fbbf24':'#15243a',color:metric===key?'#111827':'#fff',fontWeight:700,cursor:'pointer'}}>{label}</button>)}</div>
   {loading?<p>Loading career stats…</p>:error?<p role="alert">{error}</p>:!sorted.length?<p>No confirmed stats available yet.</p>:<div style={{overflowX:'auto',border:'1px solid #334155',borderRadius:16}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:320}}><thead><tr style={{background:'#172943',color:'#cbd5e1',textAlign:'left'}}><th style={{padding:16}}>Rank</th><th>Player</th><th style={{paddingRight:16,textAlign:'right'}}>{categories.find(c=>c[0]===metric)?.[1]}</th></tr></thead><tbody>{sorted.map((p,i)=><tr key={p.player_id} style={{borderTop:'1px solid #27364d'}}><td style={{padding:16,fontWeight:800,color:i<3?'#fbbf24':'#cbd5e1'}}>#{i+1}</td><td style={{fontWeight:700}}>{p.name}</td><td style={{paddingRight:16,textAlign:'right',fontSize:22,fontWeight:900}}>{metric==='air_rating'?p.air_rating?.toFixed(2):String(p[metric]??0)}</td></tr>)}</tbody></table></div>}
   <p style={{fontSize:13,color:'#94a3b8',marginTop:20}}>Verified AIR sessions only. Other imported match stats are not added until duplicate matching is complete. Rankings reflect recorded data, not necessarily every game ever played.</p>
  </div>
 </main>;
}