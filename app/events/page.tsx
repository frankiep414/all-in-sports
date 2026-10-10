import { ArrowLeft, ArrowRight, CalendarDays, Clock3, MapPin, Footprints, Trophy, Heart } from 'lucide-react';

export default function EventsPage() {
  return (
    <main className="carmitaPage">
      <nav className="nav">
        <div className="navInner">
          <a className="brand" href="/"><img src="/all-in-sports-future.png" alt="All In Sports" /></a>
          <div className="navLinks">
            <a href="/#play">Play</a>
            <a href="/#history">History</a>
            <a href="/events" aria-current="page">Events</a>
            <a href="/#community">Community</a>
          </div>
          <a href="/my-all-in" className="profileButton">My All In</a>
        </div>
      </nav>
      <section className="section" style={{ paddingTop: 95, paddingBottom: 95, maxWidth: 1120, margin: '0 auto' }}>
        <p className="eyebrow">ALL IN SPORTS // COMMUNITY EVENTS</p>
        <h1 style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1, margin: '18px 0 22px', fontWeight: 900 }}>MORE THAN <span style={{ color: '#6edcff' }}>THE GAME.</span></h1>
        <p style={{ maxWidth: 680, fontSize: '1.12rem', lineHeight: 1.7, opacity: .85, marginBottom: 42 }}>Soccer, community and unforgettable experiences. Explore our upcoming special events.</p>
        <article style={{ border: '1px solid rgba(110,220,255,.25)', borderRadius: 24, padding: 'clamp(24px, 5vw, 48px)', background: 'linear-gradient(130deg, rgba(110,220,255,.09), rgba(5,7,10,.9))' }}>
          <p className="eyebrow"><Heart size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} /> FEATURED CHARITY EVENT</p>
          <h2 style={{ fontSize: 'clamp(2.3rem, 6vw, 4.5rem)', lineHeight: 1.05, margin: '18px 0' }}>PLAY FOR <span style={{ color: '#6edcff' }}>CARMITA.</span></h2>
          <p style={{ maxWidth: 700, lineHeight: 1.7, marginBottom: 26 }}>A day honoring our mom and bringing family, friends and community together through a coed 7v7 soccer tournament, a 2-mile fun run, a 1-mile walk and a Halloween costume contest.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 26, fontWeight: 600 }}>
            <span><CalendarDays size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Saturday, October 31, 2026</span>
            <span><Clock3 size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} /> 9 AM–1 PM</span>
            <span><MapPin size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Harrison High School, Harrison, NJ</span>
          </div>
          <p style={{ marginBottom: 26 }}><Trophy size={17} style={{ verticalAlign: 'middle', marginRight: 8 }} />7v7: $250/team or $25/player <span style={{ margin: '0 10px' }}>·</span><Footprints size={17} style={{ verticalAlign: 'middle', marginRight: 8 }} />Run/walk: $25</p>
          <p style={{ marginBottom: 28, opacity: .9 }}>Proceeds will benefit the Brain Aneurysm Foundation.</p>
          <a className="primaryButton" href="/play-for-carmita">EXPLORE THE EVENT <ArrowRight size={18} /></a>
        </article>
        <p style={{ marginTop: 36, opacity: .7 }}>More All In events coming soon.</p>
        <a href="/" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginTop: 22 }}><ArrowLeft size={16} /> Back to All In Sports</a>
      </section>
    </main>
  );
}
