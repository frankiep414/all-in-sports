import Link from 'next/link';

export default function Page() {
  return (
    <main style={{minHeight:'100vh',background:'#080b10',color:'#f6f8fb',padding:'clamp(24px,5vw,72px)',fontFamily:'inherit'}}>
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,marginBottom:90}}>
        <Link href="/" style={{color:'#95d9ff',fontWeight:800,textDecoration:'none',letterSpacing:2}}>← ALL IN SPORTS</Link>
        <Link href="/my-all-in" style={{color:'#fff',textDecoration:'none'}}>MY ALL IN →</Link>
      </nav>
      <section style={{maxWidth:920,margin:'0 auto'}}>
        <p style={{color:'#95d9ff',letterSpacing:4,fontWeight:800}}>COMPETE // ALL IN SPORTS</p>
        <h1 style={{fontSize:'clamp(42px,8vw,96px)',lineHeight:1.02,margin:'18px 0',fontWeight:900}}>Bring your team. Chase the title.</h1>
        <h2 style={{fontSize:'clamp(20px,3vw,30px)',color:'#95d9ff',margin:'20px 0'}}>Leagues & Tournaments</h2>
        <p style={{fontSize:19,lineHeight:1.7,color:'#b8c1d0',maxWidth:730}}>Explore competitive soccer with All In Sports. Two upcoming league opportunities are being planned for November at Sofive Carlstadt. Registration will open soon; details are subject to confirmation.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20,marginTop:40}}>
          {[
            {name:"Men's Tuesday League",day:"Tuesdays",date:"November 3, 2026"},
            {name:"Coed Wednesday League",day:"Wednesdays",date:"November 4, 2026"}
          ].map(league=><article key={league.name} style={{border:'1px solid #38536a',borderRadius:18,padding:28,background:'#111820'}}>
            <p style={{color:'#95d9ff',fontWeight:800,fontSize:13,letterSpacing:1.5,marginTop:0}}>REGISTRATION OPEN SOON</p>
            <h3 style={{fontSize:25,margin:'8px 0 20px'}}>{league.name}</h3>
            <p><strong>Location:</strong> Sofive Carlstadt</p>
            <p><strong>First night:</strong> {league.date}</p>
            <p><strong>Schedule:</strong> {league.day}, 9:30–11:00 PM</p>
            <p style={{color:'#b8c1d0',fontSize:14,marginBottom:0}}>Planned league — final details and registration to be announced.</p>
          </article>)}
        </div>
        <section style={{marginTop:36}} aria-labelledby="tournaments-heading">
          <h2 id="tournaments-heading" style={{fontSize:28,margin:'0 0 18px'}}>Upcoming Tournaments</h2>
          <article style={{border:'1px solid #6c5364',borderRadius:18,padding:'clamp(20px,4vw,32px)',background:'#17151d'}}>
            <p style={{color:'#ffb2c9',fontWeight:800,fontSize:13,letterSpacing:1.5,marginTop:0}}>CHARITY TOURNAMENT · REGISTRATION OPEN</p>
            <h3 style={{fontSize:'clamp(25px,4vw,34px)',margin:'8px 0 12px'}}>Play for Carmita</h3>
            <p style={{color:'#d9d0d9',lineHeight:1.65}}>A coed 7v7 charity soccer tournament bringing family, friends and the community together in support of the Brain Aneurysm Foundation.</p>
            <p><strong>Date:</strong> Saturday, October 31, 2026</p>
            <p><strong>Time:</strong> 9:00 AM–1:00 PM</p>
            <p><strong>Location:</strong> Harrison High School · Harrison, NJ</p>
            <p><strong>Soccer:</strong> Coed 7v7 · $250 per team or $25 per individual</p>
            <p style={{color:'#d9d0d9',fontSize:14}}>Also featuring a 2-mile fun run, 1-mile walk and family activities.</p>
            <Link href="/play-for-carmita" style={{display:'inline-block',marginTop:14,padding:'13px 20px',borderRadius:10,background:'#ffb2c9',color:'#21121a',fontWeight:800,textDecoration:'none'}}>VIEW EVENT & REGISTER →</Link>
          </article>
        </section>
        <p style={{color:'#b8c1d0',marginTop:40}}>Want to know when the next opportunity is available? Reach out through our <Link href="/#community" style={{color:'#95d9ff'}}>community section</Link>.</p>
        <Link href="/" style={{display:'inline-block',marginTop:24,padding:'14px 22px',borderRadius:12,background:'#95d9ff',color:'#08101a',fontWeight:800,textDecoration:'none'}}>BACK TO ALL IN →</Link>
      </section>
    </main>
  );
}
