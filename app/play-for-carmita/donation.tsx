'use client';
import {useState,type FormEvent} from 'react';
export default function CarmitaDonation(){
 const [amount,setAmount]=useState(2500);
 const [custom,setCustom]=useState('');
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [other,setOther]=useState(false);
 const cents=other?Math.round(Number(custom)*100):amount;
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;
  if(!Number.isInteger(cents)||cents<100||cents>1000000){setError('Choose an amount between $1 and $10,000.');return;}
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/carmita/donate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,amountCents:cents})});
   const data=await r.json();
   if(!r.ok||typeof data.checkoutUrl!=='string')throw Error(data.error||'Unable to start donation.');
   window.location.assign(data.checkoutUrl);
  }catch(e){setError(e instanceof Error?e.message:'Unable to start donation.');setBusy(false);}
 }
 const input:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:12,borderRadius:8,border:'1px solid #a888bd',background:'white',color:'#15121a',marginTop:6};
 return <section id="donate" style={{maxWidth:650,margin:'50px auto 10px',padding:28,border:'1px solid #b97ad5',borderRadius:20,background:'#21172b',color:'white'}}>
  <p style={{color:'#e2b8ff',fontWeight:800,letterSpacing:2}}>SUPPORT THE CAUSE ❤️</p>
  <h2 style={{fontSize:'clamp(26px,5vw,38px)',margin:'10px 0'}}>Can't make it? Make a donation.</h2>
  <p style={{lineHeight:1.7}}>You don't have to play or attend to help us honor Carmita and support brain aneurysm awareness. Donations are collected by All In Sports, and event proceeds will be donated to the Brain Aneurysm Foundation.</p>
  <form onSubmit={submit}>
   <div role="group" aria-label="Donation amount" style={{display:'flex',gap:10,flexWrap:'wrap',margin:'20px 0'}}>
    {[1000,2500,5000,10000].map(v=><button key={v} type="button" aria-pressed={!other&&amount===v} onClick={()=>{setOther(false);setAmount(v);}} style={{padding:'12px 16px',borderRadius:10,border:'1px solid #c4a0d7',background:!other&&amount===v?'#e2b8ff':'#34223f',color:!other&&amount===v?'#21132a':'white',fontWeight:700}}>${v/100}</button>)}
    <button type="button" aria-pressed={other} onClick={()=>setOther(true)} style={{padding:'12px 16px',borderRadius:10,border:'1px solid #c4a0d7',background:other?'#e2b8ff':'#34223f',color:other?'#21132a':'white',fontWeight:700}}>Other amount</button>
   </div>
   {other&&<label style={{display:'block',marginBottom:16}}>Custom amount (USD)<input style={input} required type="number" min="1" max="10000" step="0.01" value={custom} onChange={e=>setCustom(e.target.value)} placeholder="25.00"/></label>}
   <label style={{display:'block',marginBottom:16}}>Your name *<input style={input} required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>
   <label style={{display:'block',marginBottom:16}}>Email for confirmation *<input style={input} required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
   <button type="submit" disabled={busy} style={{width:'100%',padding:16,border:0,borderRadius:12,background:'#e2b8ff',color:'#201329',fontWeight:800,opacity:busy?0.6:1}}>{busy?'Opening secure checkout…':`DONATE ${Number.isFinite(cents)&&cents>0?'$'+(cents/100).toFixed(2):''} SECURELY →`}</button>
   {error&&<p role="alert" style={{color:'#ffb7b7'}}>{error}</p>}
   <p style={{fontSize:13,opacity:0.85}}>Secure Stripe checkout. Donations are paid to All In Sports for the event; this is not a direct donation to the foundation, and no tax-deductibility is represented.</p>
  </form>
 </section>;
}
