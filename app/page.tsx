import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Camera,
  ChevronRight,
  CircleUserRound,
  Clock3,
  MapPin,
  Play,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

const experiences = [
  {
    icon: Play,
    eyebrow: 'PLAY',
    title: 'Pickup Soccer',
    description: 'Find your next game, claim your spot and just play.',
    meta: 'Open games coming soon',
  },
  {
    icon: Trophy,
    eyebrow: 'COMPETE',
    title: 'Leagues',
    description: 'Schedules, results, standings, playoffs and champions.',
    meta: 'Coed • Men’s • More coming',
  },
  {
    icon: Zap,
    eyebrow: 'GO ALL IN',
    title: 'Tournaments',
    description: 'One day. Big games. Bigger stakes.',
    meta: 'Team registration',
  },
  {
    icon: Users,
    eyebrow: 'CONNECT',
    title: 'Events',
    description: 'Watch parties, special events and the All In community.',
    meta: 'Beyond the field',
  },
];

const intelligence = [
  {
    icon: BarChart3,
    title: 'Player Intelligence',
    description:
      'Turn match video into player stats, performance data and insights.',
    tag: 'IN DEVELOPMENT',
  },
  {
    icon: Camera,
    title: 'Smart Highlights',
    description:
      'Find goals, assists and big moments without searching through full games.',
    tag: 'COMING SOON',
  },
  {
    icon: CircleUserRound,
    title: 'Player Profiles',
    description:
      'Every match adds to your story — stats, teams, results and highlights.',
    tag: 'COMING SOON',
  },
];

export default function Home() {
  return (
    <main>
      <nav className="nav">
        <div className="navInner">
          <a className="brand" href="#">
            <img src="/all-in-sports-future.png" alt="All In Sports" />
          </a>

          <div className="navLinks">
            <a href="#play">Play</a>
            <a href="#leagues">Leagues</a>
            <a href="#tournaments">Tournaments</a>
            <a href="#community">Community</a>
          </div>

          <button className="profileButton">
            <CircleUserRound size={18} />
            My All In
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="heroGlow heroGlowOne" />
        <div className="heroGlow heroGlowTwo" />

        <div className="gridOverlay" />

        <div className="heroContent">
          <div className="heroBadge">
            <Sparkles size={14} />
            THE FUTURE OF LOCAL SPORTS
          </div>

          <p className="heroKicker">ALL IN // AI SPORTS</p>
          
<div className="heroLogo">
  <img src="/all-in-sports-future.png" alt="All In Sports" />
</div>
          <h1>
            MORE THAN
            <br />
            <span>A GAME.</span>
          </h1>

          <p className="heroText">
            Play. Compete. Connect. A new kind of sports community built for
            the players who go all in.
          </p>

          <div className="heroActions">
            <button className="primaryButton">
              Find a Game
              <ArrowRight size={18} />
            </button>

            <button className="ghostButton">
              Explore All In
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="heroStats">
            <div>
              <strong>PLAY</strong>
              <span>Pickup & Open Play</span>
            </div>
            <div>
              <strong>COMPETE</strong>
              <span>Leagues & Tournaments</span>
            </div>
            <div>
              <strong>CONNECT</strong>
              <span>Players & Community</span>
            </div>
          </div>
        </div>

        <div className="heroVisual">
          <div className="techCard">
            <div className="techCardTop">
              <span className="liveDot" />
              ALL IN PLAYER ID
              <span className="beta">FUTURE</span>
            </div>

            <div className="playerAvatar">AI</div>

            <div className="playerIdentity">
              <span>PLAYER PROFILE</span>
              <strong>YOUR GAME.</strong>
              <strong>YOUR DATA.</strong>
            </div>

            <div className="miniStats">
              <div>
                <strong>12</strong>
                <span>GP</span>
              </div>
              <div>
                <strong>08</strong>
                <span>G</span>
              </div>
              <div>
                <strong>05</strong>
                <span>A</span>
              </div>
              <div>
                <strong>8.4</strong>
                <span>RTG</span>
              </div>
            </div>

            <div className="scanLine" />

            <p>AI-powered match intelligence</p>
          </div>
        </div>
      </section>

      <section className="section" id="play">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">YOUR NEXT MOVE</p>
            <h2>What are you here to do?</h2>
          </div>
          <p>
            One home for everything All In — from your next pickup game to the
            championship.
          </p>
        </div>

        <div className="experienceGrid">
          {experiences.map((item) => {
            const Icon = item.icon;

            return (
              <article className="experienceCard" key={item.title}>
                <div className="iconBox">
                  <Icon size={22} />
                </div>

                <span className="cardEyebrow">{item.eyebrow}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>

                <div className="cardBottom">
                  <span>{item.meta}</span>
                  <ArrowRight size={17} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section activitySection" id="leagues">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">HAPPENING AT ALL IN</p>
            <h2>The game never stops.</h2>
          </div>
        </div>

        <div className="activityGrid">
          <article className="featureEvent">
            <div className="eventImage">
              <div className="eventStatus">
                <Trophy size={15} />
                CHAMPIONS
              </div>

              <div className="eventBigText">
                <span>SUMMER 2026</span>
                <strong>COED LEAGUE</strong>
              </div>
            </div>

            <div className="eventInfo">
              <div>
                <span className="mutedLabel">SUMMER 2026 CHAMPIONS</span>
                <h3>They Not Like Us</h3>
                <p>
                  Another All In season in the books. See the road to the
                  championship, results and final standings.
                </p>
              </div>

              <button className="smallButton">
                View League
                <ArrowRight size={16} />
              </button>
            </div>
          </article>

          <div className="eventStack">
            <article className="miniEvent">
              <div className="miniIcon">
                <Play size={19} />
              </div>
              <div>
                <span className="mutedLabel">NEXT UP</span>
                <h3>Pickup Soccer</h3>
                <p>
                  <MapPin size={14} /> North Jersey
                </p>
              </div>
              <ChevronRight size={19} />
            </article>

            <article className="miniEvent" id="tournaments">
              <div className="miniIcon">
                <Trophy size={19} />
              </div>
              <div>
                <span className="mutedLabel">TOURNAMENTS</span>
                <h3>Go All In.</h3>
                <p>
                  <Users size={14} /> Team registration
                </p>
              </div>
              <ChevronRight size={19} />
            </article>

            <article className="miniEvent">
              <div className="miniIcon">
                <CalendarDays size={19} />
              </div>
              <div>
                <span className="mutedLabel">ALL IN EVENTS</span>
                <h3>More Than Soccer</h3>
                <p>
                  <Clock3 size={14} /> Events & experiences
                </p>
              </div>
              <ChevronRight size={19} />
            </article>
          </div>
        </div>
      </section>

      <section className="intelligenceSection">
        <div className="aiBackgroundText">AI</div>

        <div className="section intelligenceInner">
          <div className="intelligenceIntro">
            <div className="aiOrb">
              <Sparkles size={28} />
            </div>

            <p className="eyebrow">ALL IN INTELLIGENCE</p>

            <h2>
              YOUR GAME.
              <br />
              <span>UNLOCKED.</span>
            </h2>

            <p>
              We're building toward a future where every All In match can
              become data — automatically turning game video into stats,
              highlights and player insights.
            </p>

            <div className="futureLabel">
              <span />
              THE NEXT ERA OF ALL IN
            </div>
          </div>

          <div className="intelligenceCards">
            {intelligence.map((item) => {
              const Icon = item.icon;

              return (
                <article className="intelligenceCard" key={item.title}>
                  <div className="intelligenceCardTop">
                    <div className="intelligenceIcon">
                      <Icon size={22} />
                    </div>
                    <span>{item.tag}</span>
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.description}</p>

                  <div className="dataLine">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section communitySection" id="community">
        <div className="communityPanel">
          <div>
            <p className="eyebrow">BUILT FOR THE COMMUNITY</p>
            <h2>Your soccer world. One place.</h2>
            <p>
              Teams, schedules, standings, registrations, player profiles,
              highlights and everything that comes next.
            </p>
          </div>

          <button className="primaryButton">
            Join All In
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="platformGrid">
          <div>
            <Shield size={20} />
            <strong>YOUR TEAMS</strong>
            <span>Rosters & history</span>
          </div>
          <div>
            <CalendarDays size={20} />
            <strong>YOUR SCHEDULE</strong>
            <span>Never miss a game</span>
          </div>
          <div>
            <BarChart3 size={20} />
            <strong>YOUR STATS</strong>
            <span>Build your profile</span>
          </div>
          <div>
            <Camera size={20} />
            <strong>YOUR MOMENTS</strong>
            <span>Highlights & memories</span>
          </div>
        </div>
      </section>

      <footer>
        <div className="footerBrand">
          <img src="/all-in-logo.svg" alt="All In Sports" />
          <div>
            <strong>ALL IN SPORTS</strong>
            <span>THE FUTURE OF LOCAL SPORTS</span>
          </div>
        </div>

        <p>North Jersey • Play. Compete. Connect.</p>
      </footer>
    </main>
  );
}
