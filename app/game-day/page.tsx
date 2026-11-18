'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function GameDayPage() {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function prepareNext() {
    if(busy)return;
    setBusy(true);setError('');
    try {
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if(!url||!key)throw new Error('Sign-up service is unavailable.');
      const client=createClient(url,key);
      const {error:signoutError}=await client.auth.signOut();
      if(signoutError)throw signoutError;
      localStorage.removeItem('allInPlayerId');
      window.location.replace('/?auth=1');
    }catch(e){setError(e instanceof Error?e.message:'Could not prepare signup.');setBusy(false);}
  }
  return <main style={{minHeight:'100dvh',background:'#050b13',color:'white',fontFamily:'Arial, sans-serif',padding:'32px 18px',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <section style={{maxWidth:470,width:'100%',textAlign:'center'}}>
      <img src="/all-in-sports-future.png" alt="All In Sports" style={{width:130,height:130,objectFit:'contain'}} />
      <p style={{color:'#42dafa',fontWeight:800,letterSpacing:3,fontSize:13}}>GAME DAY SIGNUP</p>
      <h1 style={{fontSize:38,lineHeight:1.08,margin:'12px 0'}}>CLAIM YOUR PLAYER ID.</h1>
      <p style={{fontSize:17,lineHeight:1.5,color:'#cbd5e1'}}>New to All In Sports? Create your own player profile to track games, stats, ratings and player cards.</p>
      <button type="button" disabled={busy} onClick={prepareNext} style={{width:'100%',padding:20,background:'#00d5f5',color:'#03101a',border:0,borderRadius:15,fontSize:20,fontWeight:900,cursor:'pointer',marginTop:20}}>{busy?'Preparing…':'START PLAYER SIGNUP →'}</button>
      {error&&<p role="alert" style={{color:'#ff9c9c'}}>{error}</p>}
      <div style={{marginTop:28,padding:18,border:'1px solid #263849',borderRadius:14,textAlign:'left',lineHeight:1.55,color:'#d2dce7'}}>
        <strong style={{color:'white'}}>How it works</strong>
        <p>1. Tap Start. Enter your own email and verify the code sent to you.</p>
        <p>2. Complete your Player ID details and choose your notification preferences.</p>
        <p>3. Hand the phone back to the All In Sports organizer.</p>
        <p style={{fontSize:13,color:'#aab7c5'}}>Organizer: return to this page before the next player. Tapping Start signs out the previous account, so never hand the phone over while another player's account is open.</p>
      </div>
      <p style={{fontSize:13,color:'#aab7c5',lineHeight:1.5,marginTop:22}}>Player photos are optional and handled separately with the player's permission. Do not photograph or upload someone without consent.</p>
      <a href="https://www.allinsportsnj.com/game-day" style={{display:'block',marginTop:18,color:'#50dcff'}}>www.allinsportsnj.com/game-day</a>
    </section>
  </main>;
}
