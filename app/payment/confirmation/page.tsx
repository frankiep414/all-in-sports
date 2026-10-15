'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';

type PaymentState='checking'|'confirmed'|'pending'|'error';
export default function PaymentConfirmationPage(){
 const [state,setState]=useState<PaymentState>('checking');
 const [detail,setDetail]=useState('');
 useEffect(()=>{
  let active=true;
  const id=new URLSearchParams(window.location.search).get('registration_id');
  if(!id||!/^[0-9a-f-]{36}$/i.test(id)){setState('error');setDetail('Missing registration reference.');return;}
  let attempts=0;
  async function check(){
   try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if(!url||!key)throw new Error('Sign-in configuration unavailable.');
    const db=createClient(url,key);
    const {data:{session}}=await db.auth.getSession();
    if(!session?.access_token)throw new Error('Please sign in to check your payment.');
    const response=await fetch('/api/registrations',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
    if(!response.ok)throw new Error('Could not verify your registration yet.');
    const result=await response.json();
    const registration=(result.registrations||[]).find((r:{id:string})=>r.id===id);
    if(!registration)throw new Error('Registration not found in your account.');
    if(!active)return;
    if(registration.status==='confirmed'&&registration.payment_status==='paid'){
     setState('confirmed');setDetail(registration.payment_reference||'');return;
    }
    attempts++;
    if(attempts<8){setState('checking');window.setTimeout(()=>{if(active)void check();},2500);}
    else{setState('pending');setDetail('Stripe returned you to All In Sports, but we are still waiting for verified payment confirmation. Do not pay again.');}
   }catch(error){
    if(active){setState('error');setDetail(error instanceof Error?error.message:'Unable to verify payment.');}
   }
  }
  void check();
  return()=>{active=false;};
 },[]);
 return <main style={{minHeight:'100vh',background:'#080b10',color:'#f6f8fb',padding:'clamp(24px,6vw,72px)',display:'grid',placeItems:'center'}}>
  <section style={{maxWidth:600,width:'100%',background:'#111820',border:'1px solid #303945',borderRadius:20,padding:'clamp(24px,5vw,48px)',textAlign:'center'}}>
   <p style={{letterSpacing:3,color:'#95d9ff',fontWeight:800}}>ALL IN SPORTS // PAYMENT</p>
   {state==='confirmed'?<>
    <div style={{fontSize:56,color:'#9ee6bb'}}>✓</div>
    <h1 style={{fontSize:'clamp(30px,5vw,46px)'}}>Payment confirmed!</h1>
    <p style={{color:'#b8c1d0',lineHeight:1.6}}>Your payment was verified and your game reservation is confirmed.</p>
    {detail&&<p>Reference: <strong>{detail}</strong></p>}
   </>:state==='checking'?<>
    <h1>Verifying your payment…</h1>
    <p style={{color:'#b8c1d0',lineHeight:1.6}}>Stripe Checkout has returned. We're waiting for the secure payment confirmation. This can take a few moments.</p>
   </>:<>
    <h1>{state==='pending'?'Payment confirmation pending':'Unable to verify payment'}</h1>
    <p role="status" style={{color:'#b8c1d0',lineHeight:1.6}}>{detail}</p>
    <p style={{color:'#b8c1d0'}}>Please check My All In before attempting another payment.</p>
   </>}
   <div style={{display:'flex',justifyContent:'center',gap:12,flexWrap:'wrap',marginTop:28}}>
    <Link href="/my-all-in" style={{background:'#95d9ff',color:'#08101a',textDecoration:'none',padding:'12px 20px',borderRadius:10,fontWeight:800}}>VIEW MY ALL IN →</Link>
    <Link href="/play" style={{border:'1px solid #445063',color:'#fff',textDecoration:'none',padding:'12px 20px',borderRadius:10}}>BACK TO PLAY</Link>
   </div>
  </section>
 </main>;
}
