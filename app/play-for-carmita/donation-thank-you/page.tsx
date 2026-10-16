'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
export default function DonationThankYou(){
 const [result,setResult]=useState<{status:string;amountCents?:number}|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  const id=new URLSearchParams(window.location.search).get('session_id');
  if(!id){setError('Missing checkout session.');return;}
  let stopped=false,attempt=0;
  const check=async()=>{
   try{const r=await fetch('/api/carmita/donation-status?session_id='+encodeURIComponent(id),{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to check payment.');if(stopped)return;setResult(d);if(d.status==='processing'&&++attempt<12)window.setTimeout(check,2500);}
   catch(e){if(!stopped)setError(e instanceof Error?e.message:'Unable to check payment.');}
  };void check();return()=>{stopped=true;};
 },[]);
 return <main style={{minHeight:'100vh',background:'#1c1029',color:'white',display:'grid',placeItems:'center',padding:24}}><article style={{maxWidth:600,padding:40,textAlign:'center',border:'1px solid #ae7dc3',borderRadius:22}}>
 <div style={{fontSize:48}}>❤️</div><h1>Thank you for supporting Carmita.</h1>
 {result?.status==='confirmed'?<p>Your donation of <strong>${((result.amountCents||0)/100).toFixed(2)}</strong> is confirmed. Thank you for helping us honor her memory and support brain aneurysm awareness.</p>:error?<p role="alert">{error} Contact All In Sports before trying another payment.</p>:result?.status==='not_confirmed'?<p>Payment not confirmed. Contact All In Sports before trying again.</p>:<p>Checking your payment confirmation. Please wait.</p>}
 <p>Donations are collected by All In Sports. Event proceeds will be donated to the Brain Aneurysm Foundation.</p>
 <Link href="/play-for-carmita" style={{color:'#e2b8ff'}}>Back to Play for Carmita →</Link>
 </article></main>;
}
