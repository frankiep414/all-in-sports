import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Trophy,
  Users,
  Heart,
} from 'lucide-react';

export default function PlayForCarmitaPage() {
  return (
    <main className="carmitaPage">

      {/* SAME ALL IN NAV LANGUAGE */}
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

          <a href="/my-all-in" className="profileButton">
            My All In
          </a>
        </div>
      </nav>

      {/* QUICK NAVIGATION */}
<nav className="carmitaQuickNav" aria-label="Explore Play for Carmita">
  <div className="carmitaQuickNavInner">

<a href="/play-for-carmita/why-we-play">
      <span>01</span>
      <strong>WHY WE PLAY</strong>
      <span className="carmitaQuickArrow">↗</span>
    </a>

   <a href="/play-for-carmita/bigger-purpose">
      <span>02</span>
      <strong>BIGGER PURPOSE</strong>
      <span className="carmitaQuickArrow">↗</span>
    </a>

  <a href="/play-for-carmita/event-information">
      <span>03</span>
      <strong>EVENT INFORMATION</strong>
      <span className="carmitaQuickArrow">↗</span>
    </a>

    <a href="#register">
      <span>04</span>
      <strong>REGISTRATION</strong>
      <span className="carmitaQuickArrow">↗</span>
    </a>

  </div>
</nav>

      {/* HERO */}
      <section className="carmitaHero">

        <div className="carmitaHeroGrid" />
        <div className="carmitaHeroGlow" />

        <div className="carmitaHeroInner">

          <div className="carmitaHeroContent">

            <div className="carmitaSpecialEvent">
              <Heart size={14} />
              ALL IN // SPECIAL EVENT
            </div>

            <p className="carmitaKicker">
              IN HONOR OF OUR MOM
            </p>

            <h1>
              PLAY FOR
              <span>CARMITA.</span>
            </h1>

            <p className="carmitaHeroText">
              A charity soccer tournament, fun run and walk bringing family,
              friends and community together for a purpose bigger than the game.
            </p>

            <div className="carmitaHeroActions">
              <a href="#register" className="primaryButton">
                REGISTER TEAM
                <ArrowRight size={17} />
              </a>

              <a href="#register" className="ghostButton">
                REGISTER PLAYER
              </a>
            </div>

            <div className="carmitaHeroMeta">
              <div>
                <CalendarDays size={17} />
                <span>
                  <strong>OCT 31</strong>
                  SATURDAY
                </span>
              </div>

              <div>
                <Clock3 size={17} />
                <span>
                  <strong>9AM–1PM</strong>
                  EVENT TIME
                </span>
              </div>

              <div>
                <Users size={17} />
                <span>
                  <strong>COED 7V7</strong>
                  TOURNAMENT
                </span>
              </div>
            </div>

          </div>


         {/* PLAY FOR CARMITA CAMPAIGN ART */}
<div className="carmitaHeroArtwork">

  <div className="carmitaArtworkGlow" />

  <div className="carmitaArtworkFrame">
    <img
      src="/Play_For_Carmita_Correct_Official_All_In_Logo.png"
      alt="Play for Carmita charity soccer tournament"
    />

    <div className="carmitaArtworkFade" />
  </div>

</div>

        </div>
      </section>


     
     

      {/* REGISTER */}
      <section className="carmitaRegister" id="register">

        <div className="carmitaRegisterGlow" />

        <div className="carmitaRegisterInner">

          <p className="eyebrow">REGISTRATION</p>

          <h2>
            HOW ARE YOU
            <br />
            <span>GOING ALL IN?</span>
          </h2>

          <p className="carmitaRegisterLead">
            Bring your squad, come on your own, or join the 2-mile fun run / 1-mile walk.
            Individual soccer players will be placed on a team.
          </p>


          <div className="carmitaRegisterGrid">

            <button className="carmitaRegisterCard">
              <div className="carmitaRegisterNumber">01</div>

              <div>
                <span>TEAM REGISTRATION</span>
                <h3>$250</h3>
                <p>Register your full team for the tournament.</p>
              </div>

              <div className="carmitaRegisterLink">
                REGISTER TEAM
                <ArrowRight size={19} />
              </div>
            </button>


            <button className="carmitaRegisterCard">
              <div className="carmitaRegisterNumber">02</div>

              <div>
                <span>INDIVIDUAL REGISTRATION</span>
                <h3>$25</h3>
                <p>
                  Sign up individually and we&apos;ll place you on a team.
                </p>
              </div>

              <div className="carmitaRegisterLink">
                REGISTER PLAYER
                <ArrowRight size={19} />
              </div>
            </button>

            <div className="carmitaRegisterCard" role="group" aria-label="Fun run and walk registration information">
              <div className="carmitaRegisterNumber">03</div>
              <div>
                <span>FUN RUN / WALK</span>
                <h3>$25</h3>
                <p>2-mile fun run or 1-mile walk. All ages welcome.</p>
              </div>
              <div className="carmitaRegisterLink">REGISTRATION DETAILS COMING SOON</div>
            </div>
          </div>

          <p style={{ marginTop: 24, lineHeight: 1.7, opacity: 0.85 }}>
            Saturday, October 31, 2026 · 9:00 AM–1:00 PM · Harrison High School, Harrison, NJ.
            Join the Halloween costume contest for kids and adults.
            Proceeds will be donated to the Brain Aneurysm Foundation.
          </p>

          <div className="carmitaClosing">
            <span>SAME GAME.</span>
            <strong>BIGGER PURPOSE.</strong>
          </div>

        </div>
      </section>


      {/* FOOTER */}
      <footer className="carmitaFooter">

        <a href="/" className="carmitaBack">
          <ArrowLeft size={16} />
          ALL IN SPORTS
        </a>

        <p>PLAY FOR CARMITA · 2026</p>

      </footer>

    </main>
  );
}
