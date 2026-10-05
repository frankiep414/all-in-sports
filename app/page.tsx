'use client';

import { useEffect, useState } from 'react';
import AuthWelcome from './AuthWelcome';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

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

const champions = [
  {
    year: '2026',
    season: 'Summer Coed',
    team: 'They Not Like Us',
    image: '/history/2026-summer-coed-they-not-like-us.webp',
  },
  {
    year: '2026',
    season: 'Spring Tournament',
    team: 'Wolverines',
    image: '/history/2026-spring-tournament-wolverines.webp',
  },
  {
    year: '2026',
    season: 'Winter II Men’s',
    team: 'San Pedro FC',
    image: '/history/2026-winter-ii-mens-san-pedro.webp',
  },
  {
    year: '2026',
    season: 'Winter Men’s',
    team: 'All Things Soccer FC',
    image: '/history/2026-winter-mens-all-things-soccer.webp',
  },
  {
    year: '2026',
    season: 'Winter Men’s',
    team: 'They Not Like Us FC',
    image: '/history/2026-winter-mens-they-not-like-us.webp',
  },
  {
    year: '2025',
    season: 'Winter Men’s',
    team: '21FC',
    image: '/history/2025-winter-mens-21fc.webp',
  },
  {
    year: '2024',
    season: 'Winter Tournament',
    team: 'Mickey Mouse FC',
    image: '/history/2024-winter-tournament-mickey-mouse.webp',
  },
  {
    year: '2023',
    season: 'Fall Futsal',
    team: 'Gran Combo',
    image: '/history/2023-fall-futsal-gran-combo.webp',
  },
  {
    year: '2023',
    season: 'Summer',
    team: 'Gran Combo',
    image: '/history/2023-summer-gran-combo.webp',
  },
  {
    year: '2023',
    season: 'Winter',
    team: 'Los Galacticos',
    image: '/history/2023-winter-los-galacticos.webp',
  },
];

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
  const [showAuthWelcome, setShowAuthWelcome] = useState(true);
  const [showPlayerSignup, setShowPlayerSignup] = useState(true);
  const [playedBefore, setPlayedBefore] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [selectedChampion, setSelectedChampion] = useState<(typeof champions)[number] | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<{
  id: number;
  full_name: string;
} | null>(null);
  useEffect(() => {
  const savedPlayerId = localStorage.getItem('allInPlayerId');

  if (savedPlayerId) {
    setShowPlayerSignup(false);
    setShowAuthWelcome(false);

    fetch(`/api/player?id=${savedPlayerId}`)
      .then((response) => response.json())
      .then((player) => {
        if (player?.id) {
          setCurrentPlayer(player);
        }
      })
      .catch((error) => {
        console.error('Unable to load player:', error);
      });
  }
}, []);
  if (showAuthWelcome) {
  return (
    <AuthWelcome
      onEmailSignup={() => {
        setShowAuthWelcome(false);
        setShowPlayerSignup(true);
      }}
    onLogin={() => {
  setShowAuthWelcome(false);
  setShowPlayerSignup(false);
}}
    />
  );
}
return (
  <main>
    {showPlayerSignup && (
  <div className="signupOverlay">
    <div className="signupModal">

      {!signupComplete ? (
        <>
          <div className="signupEyebrow">
            <Sparkles size={15} />
            THE NEXT ERA OF ALL IN
          </div>

          <img
            className="signupLogo"
            src="/all-in-sports-future.png"
            alt="All In Sports"
          />

          <h2>CLAIM YOUR<br /><span>PLAYER ID.</span></h2>

          <p className="signupIntro">
            We&apos;ve been working behind the scenes to build the next
            generation of All In Sports — bringing together our players,
            leagues, events and new AI-powered features.
          </p>

          <form
            className="signupForm"
           onSubmit={async (e) => {
  e.preventDefault();

  const form = e.currentTarget;
  const formData = new FormData(form);

  const data = {
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    playedBefore: formData.get('playedBefore') === 'yes',
    teamName: formData.get('teamName'),
    divisions: formData.getAll('divisions'),
    smsConsent: formData.get('smsConsent') === 'on',
  };

  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Signup failed');
    }

    const result = await response.json();

localStorage.setItem('allInPlayerId', String(result.playerId));

setCurrentPlayer({
  id: result.playerId,
  full_name: String(data.fullName),
});

setSignupComplete(true);
  } catch (error) {
    console.error(error);
    alert('Something went wrong. Please try again.');
  }
}}
          >
            <label>
              Full Name
              <input
                type="text"
                name="fullName"
                placeholder="Your full name"
                required
              />
            </label>

            <div className="signupTwoColumn">
              <label>
                Cell Phone
                <input
                  type="tel"
                  name="phone"
                  placeholder="(201) 555-1234"
                  required
                />
              </label>

             
            </div>

            <div className="signupQuestion">
              <span>Have you played with All In before?</span>

              <div className="signupChoices">
                <button
                  type="button"
                  className={playedBefore ? 'active' : ''}
                  onClick={() => setPlayedBefore(true)}
                >
                  Yes
                </button>

                <button
                  type="button"
                  className={!playedBefore ? 'active' : ''}
                  onClick={() => setPlayedBefore(false)}
                >
                  No
                </button>
              </div>
            </div>

            {playedBefore && (
              <label>
                Team Name
                <input
                  type="text"
                  name="teamName"
                  placeholder="What team did you play for?"
                />
              </label>
            )}

            <div className="signupQuestion">
              <span>Which divisions are you interested in?</span>

              <div className="divisionChoices">
                <label>
                  <input type="checkbox" name="division" value="mens" />
                  Men&apos;s
                </label>

                <label>
                  <input type="checkbox" name="division" value="womens" />
                  Women&apos;s
                </label>

                <label>
                  <input type="checkbox" name="division" value="coed" />
                  Coed
                </label>
              </div>
            </div>

            <label className="smsConsent">
              <input type="checkbox" name="smsConsent" />
              <span>
                Yes, keep me All In. I agree to receive recurring automated
                texts from All In Sports about upcoming games, leagues,
                tournaments, events, Player ID updates and other All In Sports
                news. Message frequency varies. Message &amp; data rates may
                apply. Reply STOP to opt out. Consent is not a condition of
                participation.
              </span>
            </label>

            <p className="signupLegal">
  By creating your Player ID, you agree to our{' '}
  <a href="/terms" target="_blank" rel="noopener noreferrer">
    Terms of Service
  </a>{' '}
  and acknowledge our{' '}
  <a href="/privacy" target="_blank" rel="noopener noreferrer">
    Privacy Policy
  </a>
  .
</p>

            <button type="submit" className="signupSubmit">
              CREATE MY PLAYER ID
              <ArrowRight size={18} />
            </button>
          </form>
        </>
      ) : (
        <div className="signupSuccess">
          <div className="successCheck">✓</div>

          <p className="signupEyebrow">WELCOME TO ALL IN</p>

          <h2>YOU&apos;RE<br /><span>ALL IN.</span></h2>

          <p>
            Your All In Player ID has been reserved.
          </p>

          <p>
            We&apos;re building a new All In experience around our players —
            with player profiles, stats, highlights, AI-powered features and
            more.
          </p>

          <strong>Stay tuned. We&apos;re just getting started.</strong>

          <button
            className="signupSubmit"
            onClick={() => setShowPlayerSignup(false)}
          >
            EXPLORE ALL IN
            <ArrowRight size={18} />
          </button>
        </div>
      )}

    </div>
  </div>
)}
      
            {selectedChampion && (
        <div
          className="championshipOverlay"
          onClick={() => setSelectedChampion(null)}
        >
          <div
            className="championshipModal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="championshipClose"
              onClick={() => setSelectedChampion(null)}
              aria-label="Close championship"
            >
              ×
            </button>

            <div className="championshipModalImage">
              <img
                src={selectedChampion.image}
                alt={`${selectedChampion.team} - ${selectedChampion.season} ${selectedChampion.year} Champions`}
              />
              <div className="championshipModalOverlay" />

              <div className="championshipBadge">
                <Trophy size={18} />
                ALL IN CHAMPIONS
              </div>
            </div>

            <div className="championshipModalContent">
              <p className="eyebrow">
                {selectedChampion.year} • {selectedChampion.season}
              </p>

              <h2>{selectedChampion.team}</h2>

              <p className="championshipDescription">
                Forever part of All In history.
              </p>

              <div className="championshipLegacy">
                <span>ALL IN HISTORY</span>
                <strong>{selectedChampion.year}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

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

         <a href="/my-all-in" className="profileButton">
  <CircleUserRound size={18} />
  My All In
</a>
        </div>
      </nav>

      <section className="hero heroCinematic">
        <div className="heroGlow heroGlowOne" />
        <div className="heroGlow heroGlowTwo" />

        <div className="gridOverlay" />
        
        <img
  className="heroPlayer"
  src="/all-in-player.png"
  alt=""
  aria-hidden="true"
/>

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

  <div className="playerAvatar">
  <img src="/all-in-player.png" alt="Marcus Reyes" />
</div>

            <div className="playerIdentity">
  <span>PLAYER PROFILE</span>
 <strong>{currentPlayer?.full_name || 'PLAYER'}</strong>
 <small>PLAYER ID • #{currentPlayer?.id ? String(currentPlayer.id).padStart(4, '0') : '----'}</small>
</div>

            <div className="miniStats">
              <div>
                <strong>0</strong>
                <span>GP</span>
              </div>
              <div>
                <strong>0</strong>
                <span>G</span>
              </div>
              <div>
                <strong>0</strong>
                <span>A</span>
              </div>
              <div>
                <strong>Unrated</strong>
                <span>AI rating</span>
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
      <section className="historySection" id="history">
        <div className="section historyInner">
          <div className="historyHeader">
            <div>
              <p className="eyebrow">ALL IN HISTORY</p>
              <h2>
                BUILT BY THE
                <br />
                <span>CHAMPIONS.</span>
              </h2>
            </div>

            <p className="historyIntro">
              Every season leaves a mark. Explore the teams that went All In
              and earned their place in our history.
            </p>
          </div>

          <div className="championsGrid">
            {champions.map((champion, index) => (
           <article
  className="championCard"
  key={`${champion.year}-${champion.season}-${champion.team}`}
  onClick={() => setSelectedChampion(champion)}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setSelectedChampion(champion);
    }
  }}
>
                <div className="championImageWrap">
                  <img
                    src={champion.image}
                    alt={`${champion.team} - ${champion.season} ${champion.year} Champions`}
                    className="championImage"
                    loading="lazy"
                  />

                  <div className="championOverlay" />

                  <div className="championYear">
                    {champion.year}
                  </div>

                  <div className="championNumber">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>

                <div className="championInfo">
                  <div className="championTrophy">
                    <Trophy size={18} />
                    CHAMPIONS
                  </div>

                  <p>{champion.season}</p>
                  <h3>{champion.team}</h3>

                  <div className="championView">
                    VIEW CHAMPIONSHIP
                    <ArrowRight size={15} />
                  </div>
                </div>
              </article>
            ))}
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
