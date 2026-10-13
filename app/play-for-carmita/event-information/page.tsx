import { ArrowLeft, CalendarDays, Trophy, MapPin, Footprints, Users, PartyPopper, Medal, Clock3, Heart } from 'lucide-react';

export default function CarmitaEventInformationPage() {
  return (
    <main className="carmitaPage">
      <nav className="nav">
        <div className="navInner">
          <a className="brand" href="/">
            <img src="/all-in-sports-future.png" alt="All In Sports" />
          </a>
          <div className="navLinks">
            <a href="/play">Play</a>
            <a href="/compete">Leagues</a>
            <a href="/compete">Tournaments</a>
            <a href="/#community">Community</a>
          </div>
          <a href="/my-all-in" className="profileButton">My All In</a>
        </div>
      </nav>

      <div className="carmitaContent" style={{ paddingTop: '32px' }}>
        <a href="/play-for-carmita" className="carmitaBack">
          <ArrowLeft size={16} /> BACK TO PLAY FOR CARMITA
        </a>
      </div>

      {/* EVENT DETAILS */}
      <section id="event-information" className="carmitaDetailsSection">
        <div className="carmitaContent">

          <div className="carmitaDetailsHeader">
            <div>
              <p className="eyebrow">THE EVENT</p>
              <h2>
                COME PLAY.
                <br />
                <span>COME TOGETHER.</span>
              </h2>
            </div>

            <p>
              Soccer, a fun run and walk, Halloween costumes, family and community coming together for one
              unforgettable day.
            </p>
          </div>


          <div className="carmitaDetailGrid carmitaDetailGridEnhanced">

            <article className="carmitaDetailCard">
              <div className="carmitaDetailIcon"><CalendarDays size={29} /></div>

              <div>
                <span>DATE &amp; TIME</span>
                <h3>OCTOBER 31</h3><p className="carmitaDetailHighlight"><Clock3 size={15} /> 9 AM – 1 PM</p>
                <p>Saturday · 9:00 AM – 1:00 PM</p>
              </div>
            </article>


            <article className="carmitaDetailCard">
              <div className="carmitaDetailIcon"><Trophy size={29} /></div>

              <div>
                <span>TOURNAMENT</span>
                <h3>COED · 7V7</h3><p className="carmitaDetailHighlight">Soccer • Fun run • Walk</p>
                <p>$250 team · $25 individual</p>
              </div>
            </article>


            <article className="carmitaDetailCard">
              <div className="carmitaDetailIcon"><MapPin size={29} /></div>

              <div>
                <span>LOCATION</span>
                <h3>HARRISON HIGH SCHOOL</h3><p className="carmitaDetailHighlight">Harrison, New Jersey</p>
                <p>Community charity event venue</p>
              </div>
            </article>

          </div>


        {/* ACTIVITIES */}
<div className="carmitaActivityGrid carmitaActivityGridEnhanced">

  <div>
    <div className="carmitaActivityTop"><span>01</span><div className="carmitaActivityIcon"><Trophy size={30} /></div></div>
    <strong>CHARITY<br />TOURNAMENT</strong>
    <p>
      Coed 7v7 soccer for competitive and recreational teams.
      Register your team for $250 or join individually for $25.
      Individual players will be assigned to teams.
    </p>
  </div>

  <div>
    <div className="carmitaActivityTop"><span>02</span><div className="carmitaActivityIcon"><Footprints size={30} /></div></div>
    <strong>2-MILE FUN RUN<br />1-MILE WALK</strong>
    <p>All ages welcome. $25 registration for the run or walk.</p>
  </div>

  <div>
    <div className="carmitaActivityTop"><span>03</span><div className="carmitaActivityIcon"><Users size={30} /></div></div>
    <strong>KIDS + FAMILY<br />ACTIVITIES</strong>
    <p>
      A day for the whole family, featuring games, fun zones,
      and activities for kids throughout the event.
    </p>
  </div>

  <div>
    <div className="carmitaActivityTop"><span>04</span><div className="carmitaActivityIcon"><PartyPopper size={30} /></div></div>
    <strong>HALLOWEEN<br />COSTUME CONTEST</strong>
    <p>
      Keep the Halloween spirit going! Kids and adults are
      invited to dress up and join the costume contest.
    </p>
  </div>

  <div>
    <div className="carmitaActivityTop"><span>05</span><div className="carmitaActivityIcon"><Medal size={30} /></div></div>
    <strong>CHAMPIONSHIP<br />PRIZES</strong>
    <p>
      Play for the championship, compete for bragging rights,
      and celebrate with awards for the winning teams.
    </p>
  </div>

</div>

          <p style={{ marginTop: 32, lineHeight: 1.7 }}>
            <Heart size={17} style={{ verticalAlign: "middle", color: "#ff4c99", marginRight: 7 }} /> Proceeds will benefit the Brain Aneurysm Foundation.
            <a href="/play-for-carmita#register" style={{ display: 'block', marginTop: 16, textDecoration: 'underline' }}>
              View participation options →
            </a>
          </p>
        </div>
      </section>

      <footer className="carmitaFooter">
        <a href="/play-for-carmita" className="carmitaBack">
          <ArrowLeft size={16} /> BACK TO PLAY FOR CARMITA
        </a>
        <p>PLAY FOR CARMITA · 2026</p>
      </footer>
    </main>
  );
}
