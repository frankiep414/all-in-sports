'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Method = 'zelle' | 'card';

export default function PlayPage() {
  const [method, setMethod] = useState<Method>('zelle');
  const [games,setGames]=useState<Array<{id:string;title:string;venue:string;starts_at:string;ends_at:string;price_cents:number;capacity:number;registered_count:number;waitlist_count:number;spots_remaining:number}>>([]);
  const [gamesLoading,setGamesLoading]=useState(true);
  const [registrations,setRegistrations]=useState<Record<string,{status:string;payment_status:string}>>({});
  const [registering,setRegistering]=useState<string|null>(null);
  const [registrationMessage,setRegistrationMessage]=useState('');
  const [signedIn,setSignedIn]=useState(false);
  async function getToken(){
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if(!url||!key)return null;
    const client=createClient(url,key);
    const {data:{session}}=await client.auth.getSession();
    return session?.access_token||null;
  }
  async function register(gameId:string){
    setRegistering(gameId);setRegistrationMessage('');
    try{
      const token=await getToken();
      if(!token){setRegistrationMessage('Please sign in through My All In before registering.');return;}
      const response=await fetch('/api/registrations',{method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({game_id:gameId})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Registration failed.');
      setRegistrations(current=>({...current,[gameId]:{status:result.status,payment_status:'unpaid'}}));
      setGames(current=>current.map(game=>game.id===gameId?{...game,registered_count:game.registered_count+(result.status==='waitlisted'?0:1),waitlist_count:game.waitlist_count+(result.status==='waitlisted'?1:0),spots_remaining:Math.max(0,game.spots_remaining-(result.status==='waitlisted'?0:1))}:game));
      setRegistrationMessage('Registration received. Your spot is provisional; payment has not been collected. Do not send money yet.');
    }catch(error){setRegistrationMessage(error instanceof Error?error.message:'Registration failed.');}
    finally{setRegistering(null);}
  }
  useEffect(()=>{
    let active=true;
    getToken().then(async token=>{
      if(!active)return;
      setSignedIn(Boolean(token));
      if(!token)return;
      const response=await fetch('/api/registrations',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
      if(response.ok){const result=await response.json();if(active)setRegistrations(Object.fromEntries(
        (result.registrations||[]).map((r:{game_id:string;status:string;payment_status:string})=>[r.game_id,{status:r.status,payment_status:r.payment_status}])
      ));}
    }).catch(()=>{});
    return ()=>{active=false;};
  },[]);
  const [gamesError,setGamesError]=useState(false);
  useEffect(()=>{
    let active=true;
    fetch('/api/games',{cache:'no-store'}).then(async response=>{
      if(!response.ok)throw new Error('Unavailable');
      return response.json();
    }).then(result=>{if(active)setGames(result.games||[]);})
      .catch(()=>{if(active)setGamesError(true);})
      .finally(()=>{if(active)setGamesLoading(false);});
    return ()=>{active=false;};
  },[]);
  return (
    <main style={{minHeight:'100vh',background:'#080b10',color:'#f6f8fb',padding:'clamp(24px,5vw,72px)'}}>
      <nav style={{display:'flex',justifyContent:'space-between',gap:16,marginBottom:65,flexWrap:'wrap'}}>
        <Link href="/" style={{color:'#95d9ff',fontWeight:800,textDecoration:'none',letterSpacing:2}}>← ALL IN SPORTS</Link>
        <Link href="/my-all-in" style={{color:'#fff',textDecoration:'none'}}>MY ALL IN →</Link>
      </nav>
      <section style={{maxWidth:960,margin:'0 auto'}}>
        <p style={{color:'#95d9ff',letterSpacing:4,fontWeight:800}}>PLAY // PICKUP & OPEN PLAY</p>
        <h1 style={{fontSize:'clamp(42px,8vw,88px)',lineHeight:1.04,margin:'16px 0',fontWeight:900}}>Your next game starts here.</h1>
        <p style={{fontSize:19,color:'#b8c1d0',lineHeight:1.6,maxWidth:730}}>Browse upcoming All In Sports sessions and request your spot. Payments are not open yet.</p>
        <div style={{border:'1px solid #303945',borderRadius:18,padding:28,background:'#111820',marginTop:34}}>
          <h2 style={{marginTop:0}}>Upcoming games</h2>
          {gamesLoading && <p style={{color:'#b8c1d0'}}>Loading upcoming games…</p>}
          {gamesError && <p role="alert" style={{color:'#ffb7b7'}}>Unable to load games. Please try again later.</p>}
          {!gamesLoading && !gamesError && games.length===0 && <p style={{color:'#b8c1d0'}}>No games are posted yet. Check back soon.</p>}
          {!gamesError && games.map(item=><article key={item.id} style={{padding:'18px 0',borderTop:'1px solid #303945'}}>
            <h3 style={{margin:'0 0 8px'}}>{item.title}</h3>
            <p style={{color:'#b8c1d0',margin:'0 0 8px'}}>{item.venue} · {new Date(item.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'full',timeStyle:'short'})}</p>
            <p style={{margin:'0 0 8px'}}>Price: ${(item.price_cents/100).toFixed(2)} · Capacity: {item.capacity} players</p>
            <div aria-label="Game availability" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10,margin:'14px 0'}}>
              {([
                ['Spots remaining',item.spots_remaining],
                ['Registered',item.registered_count],
                ['Waitlisted',item.waitlist_count]
              ] as const).map(([label,count])=><div key={label} style={{background:'#19232e',border:'1px solid #303945',borderRadius:10,padding:'12px 10px'}}>
                <strong style={{display:'block',fontSize:24,color:'#95d9ff'}}>{count}</strong>
                <span style={{fontSize:13,color:'#b8c1d0'}}>{label}</span>
              </div>)}
            </div>
            {registrations[item.id] ? <strong style={{color:'#9ee6bb'}}>Your registration: {registrations[item.id].status==='confirmed'?'Confirmed — You’re in!':registrations[item.id].payment_status==='pending_verification'?'Payment submitted — Awaiting verification':registrations[item.id].status==='waitlisted'?'Waitlisted':registrations[item.id].status==='offered'?'Waitlist offer':registrations[item.id].status==='expired'?'Expired':'Registered — Payment due'}</strong> :
              <button type="button" disabled={registering!==null} onClick={()=>void register(item.id)}
                style={{background:'#95d9ff',color:'#08101a',border:0,borderRadius:9,padding:'11px 18px',fontWeight:800,cursor:'pointer'}}>
                {registering===item.id?'Registering…':'REQUEST A SPOT'}
              </button>}
            <p style={{color:'#b8c1d0',fontSize:14,marginTop:12}}>Payment deadline: 10:00 AM New York time on game day. Unpaid spots may be offered to waitlisted players between 10 AM and noon, with a 60-minute offer window. Payments awaiting verification are protected.</p>
            {!signedIn && <p style={{color:'#b8c1d0',fontSize:14}}><Link href="/my-all-in" style={{color:'#95d9ff'}}>Sign in or create your Player ID</Link> before registering.</p>}
          </article>)}
          {registrationMessage && <p role="status" style={{color:'#95d9ff',fontWeight:700}}>{registrationMessage}</p>}
          <p style={{color:'#95d9ff',fontWeight:700}}>Registration requests are open in this preview. Payment collection and automatic waitlist notifications are not enabled. Do not send money.</p>
        </div>
        <h2 style={{marginTop:52}}>How payment will work</h2>
        <p style={{color:'#b8c1d0'}}>Choose a method to preview the payment instructions. This is informational only — no payment or reservation is being created.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16,marginTop:20}}>
          <button type="button" onClick={()=>setMethod('zelle')} aria-pressed={method==='zelle'} style={{textAlign:'left',cursor:'pointer',border:method==='zelle'?'2px solid #95d9ff':'1px solid #303945',background:'#111820',color:'#fff',borderRadius:16,padding:24}}>
            <strong style={{fontSize:21}}>Zelle</strong><p style={{color:'#9ee6bb'}}>No added checkout fee</p><span style={{color:'#b8c1d0'}}>Payment confirmed manually by our team.</span>
          </button>
          <button type="button" onClick={()=>setMethod('card')} aria-pressed={method==='card'} style={{textAlign:'left',cursor:'pointer',border:method==='card'?'2px solid #95d9ff':'1px solid #303945',background:'#111820',color:'#fff',borderRadius:16,padding:24}}>
            <strong style={{fontSize:21}}>Card / Digital Wallet</strong><p style={{color:'#95d9ff'}}>Stripe secure checkout</p><span style={{color:'#b8c1d0'}}>Card, Apple Pay or Google Pay where supported.</span>
          </button>
        </div>
        <div style={{background:'#151d27',border:'1px solid #303945',borderRadius:16,padding:24,marginTop:16,lineHeight:1.7}}>
          {method==='zelle' ? (
            <>
              <strong>Zelle payment address</strong>
              <p style={{fontSize:19,overflowWrap:'anywhere',color:'#95d9ff',margin:'8px 0'}}>allinsports.imom@gmail.com</p>
              <p style={{color:'#b8c1d0',marginBottom:0}}>Payment instructions and references are not active. Please do not send payment until All In Sports explicitly provides instructions. Spots are confirmed only after we verify payment.</p>
            </>
          ) : (
            <>
              <strong>Secure online checkout</strong>
              <p style={{color:'#b8c1d0',marginBottom:0}}>When registration opens, you’ll see the final card price before paying. Any differences between payment methods will follow applicable rules. Your spot will be confirmed only after successful payment verification. Stripe checkout is not active yet.</p>
            </>
          )}
        </div>
        <p style={{color:'#9aa8ba',fontSize:14,marginTop:25}}>Registration requests are not payment confirmations. Do not send payment until All In Sports provides instructions.</p>
      </section>
    </main>
  );
}
