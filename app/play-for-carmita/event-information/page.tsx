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
    <img className="carmitaActivityPhoto" src="/history/2026-spring-tournament-wolverines.webp" alt="Soccer team celebrating a tournament" loading="lazy" />
    <span>01</span>
    <strong>CHARITY<br />TOURNAMENT</strong>
    <p>
      Coed 7v7 soccer for competitive and recreational teams.
      Register your team for $250 or join individually for $25.
      Individual players will be assigned to teams.
    </p>
  </div>

  <div>
    <img className="carmitaActivityPhoto" src="https://cloudfront.runthrough.co.uk/uploads/public/media/images/usHf8rRDgio807KSuNlUKFnzPCDrFQNAOgYlsPDA/usHf8rRDgio807KSuNlUKFnzPCDrFQNAOgYlsPDA/usHf8rRDgio807KSuNlUKFnzPCDrFQNAOgYlsPDA.jpg" alt="Community runners on a park path" loading="lazy" />
    <span>02</span>
    <strong>2-MILE FUN RUN<br />1-MILE WALK</strong>
    <p>All ages welcome. $25 registration for the run or walk.</p>
  </div>

  <div>
    <img className="carmitaActivityPhoto" src="https://images-prod-uitdatabank.imgix.net/bba310fa-d4de-4428-88a3-3aceee27f5cf.jpeg?auto=compress&amp;auto=format" alt="Children enjoying outdoor games" loading="lazy" />
    <span>03</span>
    <strong>KIDS + FAMILY<br />ACTIVITIES</strong>
    <p>
      A day for the whole family, featuring games, fun zones,
      and activities for kids throughout the event.
    </p>
  </div>

  <div>
    <img className="carmitaActivityPhoto" src="https://mostfunyoueverhad.com/img/lh-past/hallouweenfest-11.jpg" alt="Children dressed in Halloween costumes" loading="lazy" />
    <span>04</span>
    <strong>HALLOWEEN<br />COSTUME CONTEST</strong>
    <p>
      Keep the Halloween spirit going! Kids and adults are
      invited to dress up and join the costume contest.
    </p>
  </div>

  <div>
    <img className="carmitaActivityPhoto" src="https://images.unsplash.com/photo-1637203727317-3cc1a557cdbf?auto=format&amp;fit=crop&amp;w=900&amp;q=80" alt="Gold soccer championship trophy" loading="lazy" />
    <span>05</span>
    <strong>CHAMPIONSHIP<br />PRIZES</strong>
    <p>
      Play for the championship, compete for bragging rights,
      and celebrate with awards for the winning teams.
    </p>
  </div>

</div>
          <p style={{color:'#8996a6',fontSize:12,marginTop:12}}>Activity photos are illustrative; they do not depict this year's event.</p>

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
