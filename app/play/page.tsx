'use client';

import Link from 'next/link';
import { useState } from 'react';

type Method = 'zelle' | 'card';

export default function PlayPage() {
  const [method, setMethod] = useState<Method>('zelle');
  return (
    <main style={{minHeight:'100vh',background:'#080b10',color:'#f6f8fb',padding:'clamp(24px,5vw,72px)'}}>
      <nav style={{display:'flex',justifyContent:'space-between',gap:16,marginBottom:65,flexWrap:'wrap'}}>
        <Link href="/" style={{color:'#95d9ff',fontWeight:800,textDecoration:'none',letterSpacing:2}}>← ALL IN SPORTS</Link>
        <Link href="/my-all-in" style={{color:'#fff',textDecoration:'none'}}>MY ALL IN →</Link>
      </nav>
      <section style={{maxWidth:960,margin:'0 auto'}}>
        <p style={{color:'#95d9ff',letterSpacing:4,fontWeight:800}}>PLAY // PICKUP & OPEN PLAY</p>
        <h1 style={{fontSize:'clamp(42px,8vw,88px)',lineHeight:1.04,margin:'16px 0',fontWeight:900}}>Your next game starts here.</h1>
        <p style={{fontSize:19,color:'#b8c1d0',lineHeight:1.6,maxWidth:730}}>Browse upcoming All In Sports sessions, reserve your spot, and choose how you want to pay.</p>
        <div style={{border:'1px solid #303945',borderRadius:18,padding:28,background:'#111820',marginTop:34}}>
          <h2 style={{marginTop:0}}>Upcoming games</h2>
          <p style={{color:'#b8c1d0',lineHeight:1.6}}>No games are posted yet. Once we publish confirmed sessions, you’ll see the date, field, price, spots remaining, and registration here.</p>
          <p style={{color:'#95d9ff',fontWeight:700}}>Registration is not open yet.</p>
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
              <p style={{color:'#b8c1d0',marginBottom:0}}>When registration opens, each booking will receive a unique reference. Please do not send payment until you have an active booking and its payment instructions. Spots are confirmed only after we verify payment.</p>
            </>
          ) : (
            <>
              <strong>Secure online checkout</strong>
              <p style={{color:'#b8c1d0',marginBottom:0}}>When registration opens, you’ll see the final card price before paying. Any differences between payment methods will follow applicable rules. Your spot will be confirmed only after successful payment verification. Stripe checkout is not active yet.</p>
            </>
          )}
        </div>
        <p style={{color:'#9aa8ba',fontSize:14,marginTop:25}}>We are preparing our registration and payment system. Do not send payment for a game that has not been posted.</p>
      </section>
    </main>
  );
}
