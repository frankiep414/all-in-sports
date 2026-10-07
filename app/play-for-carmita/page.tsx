import Link from "next/link";

export default function PlayForCarmitaPage() {
  return (
    <main className="carmitaPage">

      {/* HERO */}
      <section className="carmitaHero">
        <div className="carmitaGlow carmitaGlowOne" />
        <div className="carmitaGlow carmitaGlowTwo" />
        <div className="carmitaGrid" />

        <div className="carmitaHeroInner">

          <div className="carmitaHeroCopy">
            <img
              className="carmitaAllInLogo"
              src="/ALL-IN-Firefly-LAST-new-logo-9x16.png"
              alt="All In Sports"
            />

            <p className="carmitaEyebrow">
              ALL IN SPORTS PRESENTS
            </p>

            <h1 className="carmitaTitle">
              PLAY FOR
              <span>CARMITA</span>
            </h1>

            <p className="carmitaSubtitle">
              A charity soccer tournament in honor of our mom.
            </p>

            <div className="carmitaQuickInfo">
              <span>NOV 1</span>
              <i />
              <span>11AM–4PM</span>
              <i />
              <span>COED 7v7</span>
            </div>

            <div className="carmitaHeroButtons">
              <a href="#register" className="carmitaButton carmitaButtonPrimary">
                REGISTER TEAM
                <strong>$250</strong>
              </a>

              <a href="#register" className="carmitaButton carmitaButtonSecondary">
                REGISTER PLAYER
                <strong>$25</strong>
              </a>
            </div>
          </div>

          <div className="carmitaHeroVisual">
            <div className="carmitaPhotoGlow" />

            <div className="carmitaPhotoFrame">
              <img
                src="/mom and chris_frank.jpg"
                alt="Carmita with Frank and Chris"
                className="carmitaFamilyPhoto"
              />

              <div className="carmitaPhotoFade" />

              <div className="carmitaPhotoCaption">
                <span>WHY WE PLAY</span>
                <strong>For Mom.</strong>
              </div>
            </div>
          </div>

        </div>

        <div className="carmitaScroll">
          <span>THE STORY</span>
          <div />
        </div>
      </section>


      {/* STORY */}
      <section className="carmitaStory">
        <div className="carmitaSectionInner carmitaStoryGrid">

          <div className="carmitaStoryCopy">
            <p className="carmitaSectionEyebrow">WHY WE PLAY</p>

            <h2>
              20 YEARS LATER,
              <span>HER IMPACT IS STILL WITH US.</span>
            </h2>

            <p>
              It&apos;s been 20 years since we lost our mom to a brain
              aneurysm. She was our biggest supporter, our constant source
              of love, and a huge part of the people we became.
            </p>

            <p>
              Play for Carmita is our way of bringing family, friends and
              community together through a game that has always meant so
              much to us — while raising awareness and helping support other
              families affected by brain aneurysms.
            </p>
          </div>

          <div className="carmitaFoundationCard">
            <p className="carmitaFoundationLabel">
              PLAYING FOR A BIGGER PURPOSE
            </p>

            <div className="carmitaFoundationLogoWrap">
              <img
                src="/Brain-Aneurysm-Foundation-logo-featured.jpg"
                alt="Brain Aneurysm Foundation"
              />
            </div>

            <p className="carmitaFoundationText">
              Proceeds will be donated to the
              <strong>Brain Aneurysm Foundation.</strong>
            </p>
          </div>

        </div>
      </section>


      {/* EVENT DETAILS */}
      <section className="carmitaEvent">
        <div className="carmitaSectionInner">

          <p className="carmitaSectionEyebrow">THE EVENT</p>

          <div className="carmitaSectionHeading">
            <h2>SOCCER. FAMILY. COMMUNITY.</h2>
            <p>
              One day together for competition, family and a purpose
              bigger than the game.
            </p>
          </div>

          <div className="carmitaDetails">

            <div className="carmitaDetail">
              <span>01</span>
              <p>DATE &amp; TIME</p>
              <h3>SUNDAY<br />NOVEMBER 1</h3>
              <small>11:00 AM – 4:00 PM</small>
            </div>

            <div className="carmitaDetail">
              <span>02</span>
              <p>TOURNAMENT</p>
              <h3>COED<br />7V7</h3>
              <small>Team + individual registration</small>
            </div>

            <div className="carmitaDetail">
              <span>03</span>
              <p>LOCATION</p>
              <h3>COMING<br />SOON</h3>
              <small>Harrison / Jersey City, NJ</small>
            </div>

          </div>


          <div className="carmitaActivities">
            <div>
              <span>01</span>
              <strong>CHARITY<br />TOURNAMENT</strong>
            </div>

            <div>
              <span>02</span>
              <strong>KIDS &amp; FAMILY<br />ACTIVITIES</strong>
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


      {/* REGISTRATION */}
      <section id="register" className="carmitaRegister">
        <div className="carmitaRegisterGlow" />

        <div className="carmitaRegisterInner">

          <p className="carmitaSectionEyebrow">JOIN US</p>

          <h2>
            PLAY FOR
            <span>SOMETHING BIGGER.</span>
          </h2>

          <p className="carmitaRegisterIntro">
            Build your team or sign up individually. Individual players
            will be placed on a team.
          </p>

          <div className="carmitaRegisterOptions">

            <button className="carmitaRegisterCard carmitaTeamCard">
              <div>
                <span>TEAM REGISTRATION</span>
                <h3>$250</h3>
                <p>PER TEAM</p>
              </div>

              <strong>REGISTER TEAM →</strong>
            </button>

            <button className="carmitaRegisterCard">
              <div>
                <span>INDIVIDUAL REGISTRATION</span>
                <h3>$25</h3>
                <p>PER PLAYER</p>
              </div>

              <strong>REGISTER PLAYER →</strong>
            </button>

          </div>

          <p className="carmitaPurpose">
            SAME GAME. <span>BIGGER PURPOSE.</span>
          </p>

        </div>
      </section>


      {/* FOOTER */}
      <footer className="carmitaFooter">
        <span>PLAY FOR CARMITA · ALL IN SPORTS</span>

        <Link href="/">
          BACK TO ALL IN SPORTS →
        </Link>
      </footer>

    </main>
  );
}
