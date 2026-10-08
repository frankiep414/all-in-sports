import Link from 'next/link';

export default function Page() {
  return (
    <main style={{minHeight:'100vh',background:'#080b10',color:'#f6f8fb',padding:'clamp(24px,5vw,72px)',fontFamily:'inherit'}}>
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,marginBottom:90}}>
        <Link href="/" style={{color:'#95d9ff',fontWeight:800,textDecoration:'none',letterSpacing:2}}>← ALL IN SPORTS</Link>
        <Link href="/my-all-in" style={{color:'#fff',textDecoration:'none'}}>MY ALL IN →</Link>
      </nav>
      <section style={{maxWidth:920,margin:'0 auto'}}>
        <p style={{color:'#95d9ff',letterSpacing:4,fontWeight:800}}>EVENTS // ALL IN SPORTS</p>
        <h1 style={{fontSize:'clamp(42px,8vw,96px)',lineHeight:1.02,margin:'18px 0',fontWeight:900}}>More than just the game.</h1>
        <h2 style={{fontSize:'clamp(20px,3vw,30px)',color:'#95d9ff',margin:'20px 0'}}>Parties & Community</h2>
        <p style={{fontSize:19,lineHeight:1.7,color:'#b8c1d0',maxWidth:730}}>All In Sports brings people together through private group events, celebrations, and community activities. Details and availability are shared directly with our team.</p>
        <section style={{marginTop:44,padding:'clamp(24px,4vw,44px)',border:'1px solid #a66ac2',borderRadius:22,background:'linear-gradient(135deg,#25162f,#12151e)'}}>
          <p style={{color:'#e2b8ff',letterSpacing:3,fontWeight:800}}>FEATURED COMMUNITY EVENT</p>
          <h3 style={{fontSize:'clamp(30px,5vw,54px)',margin:'12px 0'}}>PLAY FOR CARMITA</h3>
          <p style={{fontSize:19,color:'#e4d8ec',lineHeight:1.6}}>A charity soccer tournament honoring our mom and supporting the Brain Aneurysm Foundation.</p>
          <p style={{color:'#fff',lineHeight:1.8}}>Saturday, October 31, 2026 · 9 AM–2 PM<br />Coed 7v7 · $250 per team / $25 per player<br />Harrison / Jersey City, NJ · Venue to be confirmed</p>
          <Link href="/play-for-carmita" style={{display:'inline-block',marginTop:16,padding:'15px 24px',borderRadius:12,background:'#e2b8ff',color:'#160d1b',fontWeight:900,textDecoration:'none'}}>EXPLORE THE EVENT →</Link>
        </section>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:16,marginTop:48}}>
          <div style={{border:'1px solid #303945',borderRadius:18,padding:24,background:'#111820'}}><strong style={{fontSize:20}}>Private group events</strong><p style={{color:'#95d9ff',fontSize:13}}>DETAILS COMING SOON</p></div>
          <div style={{border:'1px solid #303945',borderRadius:18,padding:24,background:'#111820'}}><strong style={{fontSize:20}}>Celebrations</strong><p style={{color:'#95d9ff',fontSize:13}}>DETAILS COMING SOON</p></div>
          <div style={{border:'1px solid #303945',borderRadius:18,padding:24,background:'#111820'}}><strong style={{fontSize:20}}>Community events</strong><p style={{color:'#95d9ff',fontSize:13}}>DETAILS COMING SOON</p></div>
        </div>
        <p style={{color:'#b8c1d0',marginTop:40}}>Want to know when the next opportunity is available? Reach out through our <Link href="/#community" style={{color:'#95d9ff'}}>community section</Link>.</p>
        <Link href="/" style={{display:'inline-block',marginTop:24,padding:'14px 22px',borderRadius:12,background:'#95d9ff',color:'#08101a',fontWeight:800,textDecoration:'none'}}>BACK TO ALL IN →</Link>
      </section>
    </main>
  );
}
