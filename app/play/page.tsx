import Link from 'next/link';

export default function PlayPage() {
  return (
    <main style={{minHeight:'100vh',background:'#080b10',color:'#f6f8fb',padding:'clamp(24px,5vw,72px)',fontFamily:'inherit'}}>
      <nav style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',marginBottom:90}}>
        <Link href="/" style={{color:'#95d9ff',fontWeight:800,textDecoration:'none',letterSpacing:2}}>← ALL IN SPORTS</Link>
        <Link href="/my-all-in" style={{color:'#fff',textDecoration:'none'}}>MY ALL IN →</Link>
      </nav>
      <section style={{maxWidth:920,margin:'0 auto'}}>
        <p style={{color:'#95d9ff',letterSpacing:4,fontWeight:800}}>PLAY // ALL IN SPORTS</p>
        <h1 style={{fontSize:'clamp(42px,8vw,96px)',lineHeight:1.02,margin:'18px 0',fontWeight:900}}>Show up. Play more.</h1>
        <h2 style={{fontSize:'clamp(20px,3vw,30px)',color:'#95d9ff',margin:'20px 0'}}>Pickup Games & Community Events</h2>
        <p style={{fontSize:19,lineHeight:1.7,color:'#b8c1d0',maxWidth:730}}>Find opportunities to get on the field with All In Sports. Pickup game listings and online registration will appear here when available.</p>
        <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:36}}>
          <Link href="/events" style={{display:'inline-block',padding:'14px 22px',borderRadius:12,background:'#95d9ff',color:'#08101a',fontWeight:800,textDecoration:'none'}}>EXPLORE EVENTS →</Link>
          <Link href="/play-for-carmita" style={{display:'inline-block',padding:'14px 22px',borderRadius:12,border:'1px solid #4a637c',color:'#fff',fontWeight:800,textDecoration:'none'}}>PLAY FOR CARMITA →</Link>
        </div>
        <p style={{color:'#b8c1d0',marginTop:40}}>Pickup registration is not yet enabled on this page. We won't collect payment or reserve a spot here until the full game registration system is ready.</p>
      </section>
    </main>
  );
}
