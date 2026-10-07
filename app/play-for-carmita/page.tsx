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
              A charity soccer tournament bringing family, friends and
              community together for a purpose bigger than the game.
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
                  <strong>NOV 1</strong>
                  SUNDAY
                </span>
              </div>

              <div>
                <Clock3 size={17} />
                <span>
                  <strong>11AM–4PM</strong>
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


          {/* ORIGINAL PHOTO — NEVER ALTERED */}
          <div className="carmitaHeroPhoto">

            <div className="carmitaPhotoAura" />

            <div className="carmitaPhotoShell">
              <img
                src="/mom and chris_frank.jpg"
                alt="Carmita with Frank and Chris"
              />

              <div className="carmitaPhotoOverlay" />

              <div className="carmitaPhotoTag">
                <span>WHY WE PLAY</span>
                <strong>FOR MOM.</strong>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* EVENT BAR */}
      <section className="carmitaEventBar">
        <div className="carmitaEventBarInner">

          <div>
            <span>01</span>
            <strong>SUNDAY, NOVEMBER 1</strong>
          </div>

          <div>
            <span>02</span>
            <strong>11:00 AM – 4:00 PM</strong>
          </div>

          <div>
            <span>03</span>
            <strong>COED · 7V7</strong>
          </div>

          <div>
            <span>04</span>
            <strong>SAME GAME. BIGGER PURPOSE.</strong>
          </div>

        </div>
      </section>


      {/* STORY */}
      <section className="carmitaStory">
        <div className="carmitaContent">

          <div className="carmitaStoryHeading">
            <div>
              <p className="eyebrow">WHY WE PLAY</p>

              <h2>
                20 YEARS LATER.
                <br />
                <span>STILL ALL IN.</span>
              </h2>
            </div>

            <div className="carmitaStoryText">
              <p>
                It&apos;s been 20 years since we lost our mom to a brain
                aneurysm. She was our biggest supporter, our constant source
                of love, and a huge part of the people we became.
              </p>

              <p>
                Play for Carmita is our way of bringing family, friends and
                community together through a game that has always meant so
                much to us — while raising awareness and helping support
                families affected by brain aneurysms.
              </p>
            </div>
          </div>


          {/* FOUNDATION */}
          <div className="carmitaFoundation">

            <div className="carmitaFoundationCopy">
              <p className="eyebrow">PLAYING FOR A BIGGER PURPOSE</p>

              <h3>
                MORE THAN
                <br />
                <span>A GAME.</span>
              </h3>

              <p>
                Proceeds from Play for Carmita will be donated to the
                Brain Aneurysm Foundation.
              </p>
            </div>

            <div className="carmitaFoundationLogo">
              <img
                src="/Brain-Aneurysm-Foundation-logo-featured.jpg"
                alt="Brain Aneurysm Foundation"
              />
            </div>

          </div>

        </div>
      </section>


      {/* EVENT DETAILS */}
      <section className="carmitaDetailsSection">
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
              Soccer, family and community coming together for one
              unforgettable day.
            </p>
          </div>


          <div className="carmitaDetailGrid">

            <article className="carmitaDetailCard">
              <CalendarDays size={25} />

              <div>
                <span>DATE &amp; TIME</span>
                <h3>NOVEMBER 1</h3>
                <p>Sunday · 11:00 AM – 4:00 PM</p>
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
                <h3>COMING SOON</h3>
                <p>Harrison / Jersey City, NJ</p>
              </div>
            </article>

          </div>


          {/* ACTIVITIES */}
          <div className="carmitaActivityGrid">

            <div>
              <span>01</span>
              <strong>CHARITY<br />TOURNAMENT</strong>
            </div>

            <div>
              <span>02</span>
              <strong>KIDS + FAMILY<br />ACTIVITIES</strong>
            </div>

            <div>
              <span>03</span>
              <strong>HALLOWEEN<br />COSTUME CONTEST</strong>
            </div>

            <div>
              <span>04</span>
              <strong>CHAMPIONSHIP<br />PRIZES</strong>
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
            Bring your squad or come on your own. Individual players
            will be placed on a team.
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

          </div>


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
