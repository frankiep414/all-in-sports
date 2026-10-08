import Link from 'next/link';

export default function Page() {
  return (
    <main style={{minHeight:'100vh',background:'#080b10',color:'#f6f8fb',padding:'clamp(24px,5vw,72px)',fontFamily:'inherit'}}>
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,marginBottom:90}}>
        <Link href="/" style={{color:'#95d9ff',fontWeight:800,textDecoration:'none',letterSpacing:2}}>← ALL IN SPORTS</Link>
        <Link href="/my-all-in" style={{color:'#fff',textDecoration:'none'}}>MY ALL IN →</Link>
      </nav>
      <section style={{maxWidth:920,margin:'0 auto'}}>
        <p style={{color:'#95d9ff',letterSpacing:4,fontWeight:800}}>PLAY // ALL IN SPORTS</p>
        <h1 style={{fontSize:'clamp(42px,8vw,96px)',lineHeight:1.02,margin:'18px 0',fontWeight:900}}>Get back on the field.</h1>
        <h2 style={{fontSize:'clamp(20px,3vw,30px)',color:'#95d9ff',margin:'20px 0'}}>Pickup & Open Play</h2>
        <p style={{fontSize:19,lineHeight:1.7,color:'#b8c1d0',maxWidth:730}}>Join the All In community for pickup soccer and open play. We're preparing the next sessions and will share confirmed dates and registration details when available.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:16,marginTop:48}}>
          <div style={{border:'1px solid #303945',borderRadius:18,padding:24,background:'#111820'}}><strong style={{fontSize:20}}>Pickup soccer</strong><p style={{color:'#95d9ff',fontSize:13}}>DETAILS COMING SOON</p></div>
          <div style={{border:'1px solid #303945',borderRadius:18,padding:24,background:'#111820'}}><strong style={{fontSize:20}}>Open play</strong><p style={{color:'#95d9ff',fontSize:13}}>DETAILS COMING SOON</p></div>
          <div style={{border:'1px solid #303945',borderRadius:18,padding:24,background:'#111820'}}><strong style={{fontSize:20}}>Community games</strong><p style={{color:'#95d9ff',fontSize:13}}>DETAILS COMING SOON</p></div>
        </div>
        <p style={{color:'#b8c1d0',marginTop:40}}>Want to know when the next opportunity is available? Reach out through our <Link href="/#community" style={{color:'#95d9ff'}}>community section</Link>.</p>
        <Link href="/" style={{display:'inline-block',marginTop:24,padding:'14px 22px',borderRadius:12,background:'#95d9ff',color:'#08101a',fontWeight:800,textDecoration:'none'}}>BACK TO ALL IN →</Link>
      </section>
    </main>
  );
}
