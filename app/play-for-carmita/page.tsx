import CarmitaRegistration from './registration';

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
            <a href="/play">Play</a>
            <a href="/compete">Leagues</a>
            <a href="/compete">Tournaments</a>
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
              <a href="?type=team#register" className="primaryButton">
                REGISTER TEAM
                <ArrowRight size={17} />
              </a>

              <a href="?type=individual#register" className="ghostButton">
                REGISTER INDIVIDUALLY · $25
              </a>
            </div>
            <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.6, opacity: 0.9 }}>Individual registration is $25 total and covers soccer, the fun run/walk, or both. Team registration is $250.</p>

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
      src="https://raw.githubusercontent.com/frankiep414/all-in-sports/main/public/play_for_carmita_original_photo_preserved%20%281%29.png"
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
            One $25 individual registration covers soccer, the 2-mile fun run / 1-mile walk, or both. Soccer players must be 16+ and solo players will be placed on a team. Full soccer teams register for $250.
          </p>


          <CarmitaRegistration />

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
