import { ArrowLeft, CalendarDays, Trophy, MapPin } from 'lucide-react';

export default function CarmitaEventInformationPage() {
  return (
    <main className="carmitaPage">
      <nav className="nav">
        <div className="navInner">
          <a className="brand" href="/">
            <img src="/all-in-sports-future.png" alt="All In Sports" />
          </a>
          <div className="navLinks">
            <a href="/#play">Play</a>
            <a href="/#leagues">Leagues</a>
            <a href="/#tournaments">Tournaments</a>
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


          <div className="carmitaDetailGrid">

            <article className="carmitaDetailCard">
              <CalendarDays size={25} />

              <div>
                <span>DATE &amp; TIME</span>
                <h3>OCTOBER 31</h3>
                <p>Saturday · 9:00 AM – 1:00 PM</p>
              </div>
            </article>


            <article className="carmitaDetailCard">
              <Trophy size={25} />

              <div>
                <span>TOURNAMENT</span>
                <h3>COED · 7V7</h3>
                <p>$250 team · $25 individual</p>
              </div>
            </article>


            <article className="carmitaDetailCard">
              <MapPin size={25} />

              <div>
                <span>LOCATION</span>
                <h3>HARRISON HIGH SCHOOL</h3>
                <p>Harrison, NJ</p>
              </div>
            </article>

          </div>


        {/* ACTIVITIES */}
<div className="carmitaActivityGrid">

  <div>
    <span>01</span>
    <strong>CHARITY<br />TOURNAMENT</strong>
    <p>
      Coed 7v7 soccer for competitive and recreational teams.
      Register your team for $250 or join individually for $25.
      Individual players will be assigned to teams.
    </p>
  </div>

  <div>
    <span>02</span>
    <strong>2-MILE FUN RUN<br />1-MILE WALK</strong>
    <p>All ages welcome. $25 registration for the run or walk.</p>
  </div>

  <div>
    <span>03</span>
    <strong>KIDS + FAMILY<br />ACTIVITIES</strong>
    <p>
      A day for the whole family, featuring games, fun zones,
      and activities for kids throughout the event.
    </p>
  </div>

  <div>
    <span>04</span>
    <strong>HALLOWEEN<br />COSTUME CONTEST</strong>
    <p>
      Keep the Halloween spirit going! Kids and adults are
      invited to dress up and join the costume contest.
    </p>
  </div>

  <div>
    <span>05</span>
    <strong>CHAMPIONSHIP<br />PRIZES</strong>
    <p>
      Play for the championship, compete for bragging rights,
      and celebrate with awards for the winning teams.
    </p>
  </div>

</div>

          <p style={{ marginTop: 32, lineHeight: 1.7 }}>
            Proceeds will be donated to the Brain Aneurysm Foundation.
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
