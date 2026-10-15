// Deployment refresh: trigger Vercel production build for merged auth updates (2026-10-15).
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
  ChevronDown,
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
  const [featuredGames,setFeaturedGames] = useState<Array<{id:string;title:string;venue:string;starts_at:string;price_cents:number;spots_remaining:number}>>([]);
  useEffect(()=>{
    let active=true;
    fetch('/api/games',{cache:'no-store'})
      .then(response=>response.ok?response.json():{games:[]})
      .then(data=>{if(active)setFeaturedGames((data.games||[]).slice(0,2));})
      .catch(()=>{});
    return ()=>{active=false;};
  },[]);
  const charityUpcoming = Date.now() < new Date('2026-11-01T00:00:00-04:00').getTime();
  const [showAuthWelcome, setShowAuthWelcome] = useState(false);
  const [showPlayerSignup, setShowPlayerSignup] = useState(false);
  const [playedBefore, setPlayedBefore] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [selectedChampion, setSelectedChampion] = useState<(typeof champions)[number] | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<{
  id: number;
  full_name: string;
} | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [playerLoadError, setPlayerLoadError] = useState('');

  function getPickupReturnPath() {
    const params = new URLSearchParams(window.location.search);
    const destination = params.get('returnTo') || '';
    // Only allow known, internal sign-in destinations (never external redirects).
    if (destination === '/my-all-in' || destination === '/play' || destination.startsWith('/play?')) return destination;
    return null;
  }

  async function loadVerifiedPlayer() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user?.email) {
      localStorage.removeItem('allInPlayerId');
      setCurrentPlayer(null);
      setIsAdmin(false);
      if (new URLSearchParams(window.location.search).get('auth') === '1') setShowAuthWelcome(true);
      setAuthChecking(false);
      return;
    }

    setIsAdmin(false);
    fetch('/api/admin/access',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'})
      .then(response=>response.ok?response.json():{isAdmin:false})
      .then(data=>setIsAdmin(data.isAdmin===true))
      .catch(()=>setIsAdmin(false));
    const email = session.user.email;
    setVerifiedEmail(email);
    setPlayerLoadError('');
    try {
      const response = await fetch('/api/player', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
      if (response.ok) {
        const player = await response.json();
        if (player?.id) {
          localStorage.setItem('allInPlayerId', String(player.id));
          setCurrentPlayer(player);
          setShowPlayerSignup(false);
          setShowAuthWelcome(false);
          const pickupReturn = getPickupReturnPath();
          if (pickupReturn) window.location.replace(pickupReturn);
        }
      } else if (response.status === 404) {
        localStorage.removeItem('allInPlayerId');
        setCurrentPlayer(null);
        setSignupComplete(false);
        setShowPlayerSignup(true);
        setShowAuthWelcome(false);
      } else {
        setPlayerLoadError('Your sign-in succeeded, but we could not load your Player ID. Please try again.');
      }
    } catch (error) {
      console.error('Unable to load player:', error);
      setPlayerLoadError('Your sign-in succeeded, but we could not load your Player ID. Please try again.');
    } finally {
      setAuthChecking(false);
    }
  }

  useEffect(() => {
    void loadVerifiedPlayer();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        window.setTimeout(() => { void loadVerifiedPlayer(); }, 0);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('allInPlayerId');
        setCurrentPlayer(null);
        setIsAdmin(false);
        setVerifiedEmail('');
        setShowPlayerSignup(false);
        setShowAuthWelcome(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authChecking) return <main style={{ minHeight: '100vh', background: '#050505', color: '#fff', display: 'grid', placeItems: 'center' }}>Loading All In Sports…</main>;
  if (playerLoadError) return <main style={{ minHeight: '100vh', background: '#050505', color: '#fff', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}><div><h1>PLAYER PROFILE UNAVAILABLE</h1><p>{playerLoadError}</p><button type="button" onClick={() => { setAuthChecking(true); void loadVerifiedPlayer(); }} style={{ padding: '12px 24px', cursor: 'pointer' }}>Retry Player ID lookup</button></div></main>;
  if (showAuthWelcome) {
  return (
    <div><button type="button" onClick={() => setShowAuthWelcome(false)} style={{position:'fixed',top:16,left:16,zIndex:20,padding:'12px 16px',background:'#172337',color:'#fff',border:'1px solid #456',borderRadius:8,cursor:'pointer'}}>← Explore All In Sports</button><AuthWelcome
      onEmailSignup={() => {
        void loadVerifiedPlayer();
      }}
    onLogin={() => {
  void loadVerifiedPlayer();
}}
    /></div>
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
    emailConsent: formData.get('emailConsent') === 'on',
  };

  try {
    const { data: { session: signupSession } } = await supabase.auth.getSession();
    if (!signupSession?.access_token) {
      setShowPlayerSignup(false);
      setShowAuthWelcome(true);
      return;
    }
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${signupSession.access_token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(typeof result.error === 'string' ? result.error : 'Unable to create Player ID. Please try again.');
    }

localStorage.setItem('allInPlayerId', String(result.playerId));

setCurrentPlayer({
  id: result.playerId,
  full_name: String(data.fullName),
});

setSignupComplete(true);
const pickupReturn = getPickupReturnPath();
if (pickupReturn) window.location.replace(pickupReturn);
  } catch (error) {
    console.error(error);
    alert(error instanceof Error ? error.message : 'Unable to finish creating your Player ID. Please try again.');
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

            <label>
  Email
  <input
    type="email"
    name="email"
 defaultValue={verifiedEmail}
    required
  />
</label>
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

            <label className="smsConsent">
              <input type="checkbox" name="emailConsent" />
              <span>
                Yes, email me All In Sports announcements about upcoming games,
                leagues, tournaments and events. I can unsubscribe at any time.
                This is optional and separate from text-message consent.
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
            <a href="/play">Play</a>
            <a href="/compete">Compete</a>
            <a href="/events">Events</a>
            <a href="#history">History</a>
          </div>

     {currentPlayer ? (
        <div className="profileDropdown">
          <details>
            <summary className="profileButton"><CircleUserRound size={18} />{currentPlayer.full_name.split(' ')[0]}<ChevronDown size={16} /></summary>
            <div className="profileDropdownMenu">
              <a href="/my-all-in">My All In Profile</a>
              {isAdmin && <a href="/admin">Admin Dashboard</a>}
            </div>
          </details>
        </div>
      ) : <button type="button" className="profileButton" onClick={() => setShowAuthWelcome(true)} style={{cursor:'pointer',font:'inherit'}}><CircleUserRound size={18} />Log In / Sign Up</button>}
        </div>
      </nav>

      <aside className="homeFeaturedStrip" aria-label="Featured upcoming activities">
        <div className="homeFeaturedStripInner">
          <strong className="homeFeaturedStripLabel"><Zap size={16}/> WHAT'S NEXT</strong>
          {featuredGames.slice(0,1).map(game=><a href={`/play?game=${encodeURIComponent(game.id)}`} key={game.id}><Play size={16}/><span>Next Pickup: {game.title}</span><ArrowRight size={15}/></a>)}
          <a href="/compete"><Trophy size={16}/><span>Men's League · Nov 3</span><ArrowRight size={15}/></a>
          <a href="/compete"><Trophy size={16}/><span>Coed League · Nov 4</span><ArrowRight size={15}/></a>
          {charityUpcoming && <a href="/play-for-carmita"><CalendarDays size={16}/><span>Play for Carmita · Oct 31</span><ArrowRight size={15}/></a>}
        </div>
      </aside>

      <section className="homeLaunchpad">
  <div className="launchpadInner">

    <div className="launchpadIntro">
     <p className="launchpadEyebrow">
  WELCOME BACK{currentPlayer?.full_name ? `, ${currentPlayer.full_name.split(' ')[0].toUpperCase()}` : ''}.
</p>

      <h1>
        WHAT DO YOU WANT
        <br />
        TO <span>DO?</span>
      </h1>

      <p className="launchpadSubtitle">
        Play soccer. Compete. Meet people. Go All In.
      </p>
    </div>
<a href="/my-all-in" className="launchpadPlayer">
  <img
    src="/all-in-player.png"
    alt=""
    aria-hidden="true"
  />

  <div className="launchpadPlayerInfo">
    <span>MY ALL IN</span>
    <strong>{currentPlayer?.full_name || 'PLAYER'}</strong>
    <small>
      PLAYER ID • #{currentPlayer?.id
        ? String(currentPlayer.id).padStart(4, '0')
        : '----'}
    </small>
    <div className="launchpadMiniStats">
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
    <strong>—</strong>
    <span>AI RATING</span>
  </div>
</div>
  </div>
</a>
    <div
  className="mobilePlayerIdentity"
  onClick={() => window.location.href = '/my-all-in'}
  role="link"
  tabIndex={0}
>
  <img
    src="/all-in-player.png"
    alt=""
    aria-hidden="true"
  />

  <div className="mobilePlayerDetails">
    <span className="mobilePlayerLabel">MY ALL IN</span>

    <strong>
      {currentPlayer?.full_name || 'PLAYER'}
    </strong>

    <small>
      PLAYER ID • #{currentPlayer?.id
        ? String(currentPlayer.id).padStart(4, '0')
        : '----'}
    </small>

    <div className="mobilePlayerStats">
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
        <strong>—</strong>
        <span>AI RATING</span>
      </div>
    </div>
  </div>
</div>
    <div className="launchpadGrid">

      <a href="/play" className="launchCard">
        <div className="launchIcon">
          <Play size={28} />
        </div>

        <div className="launchCardContent">
          <span className="launchNumber">01</span>
          <h2>PLAY</h2>
          <p>Pickup & Open Play</p>
        </div>

        <ArrowRight className="launchArrow" size={24} />
      </a>

      <a href="/compete" className="launchCard">
        <div className="launchIcon">
          <Trophy size={28} />
        </div>

        <div className="launchCardContent">
          <span className="launchNumber">02</span>
          <h2>COMPETE</h2>
          <p>Leagues & Tournaments</p>
        </div>

        <ArrowRight className="launchArrow" size={24} />
      </a>

      <a href="/events" className="launchCard">
        <div className="launchIcon">
          <CalendarDays size={28} />
        </div>

        <div className="launchCardContent">
          <span className="launchNumber">03</span>
          <h2>EVENTS</h2>
          <p>Parties & Special Events</p>
        </div>

        <ArrowRight className="launchArrow" size={24} />
      </a>

      <a href="#history" className="launchCard">
  <div className="launchIcon">
    <Trophy size={28} />
  </div>

  <div className="launchCardContent">
    <span className="launchNumber">04</span>
    <h2>HISTORY</h2>
    <p>Champions & All In Legacy</p>
  </div>

  <ArrowRight className="launchArrow" size={24} />
</a>

    </div>

    <p className="launchpadHint">
      Choose where you want to go.
    </p>

  </div>
</section>
      <section className="featuredSection" aria-labelledby="featured-heading">
        <div className="featuredHeading">
          <div>
            <p className="eyebrow">DON'T MISS OUT</p>
            <h2 id="featured-heading">UPCOMING <span>&amp; FEATURED</span></h2>
            <p>Pickup games, upcoming leagues, and special events — all in one place.</p>
          </div>
          <a href="/play" className="featuredAllGames">SEE ALL GAMES <ArrowRight size={18}/></a>
        </div>
        <div className="featuredGrid">
          {featuredGames.map(game=>(
            <a className="featuredCard featuredPickup" href={`/play?game=${encodeURIComponent(game.id)}`} key={game.id}>
              <div className="featuredCardVisual"><Play size={38}/><span>UPCOMING PICKUP</span></div>
              <div className="featuredCardBody">
                <span className="featuredCategory">PLAY · PICKUP SOCCER</span>
                <h3>{game.title}</h3>
                <p><CalendarDays size={17}/>{new Date(game.starts_at).toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',timeZone:'America/New_York'})} · {new Date(game.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})}</p>
                <p><MapPin size={17}/>{game.venue}</p>
                <span className="featuredAction">VIEW GAME &amp; REGISTER <ArrowRight size={18}/></span>
              </div>
            </a>
          ))}
          {[
            {title:"Men's Tuesday League",start:"Tuesday, November 3",day:"Tuesdays"},
            {title:"Coed Wednesday League",start:"Wednesday, November 4",day:"Wednesdays"}
          ].map(league=>(
            <a className="featuredCard featuredLeague" href="/compete" key={league.title}>
              <div className="featuredCardVisual"><Trophy size={38}/><span>REGISTRATION OPENING SOON</span></div>
              <div className="featuredCardBody">
                <span className="featuredCategory">COMPETE · UPCOMING LEAGUE</span>
                <h3>{league.title}</h3>
                <p><CalendarDays size={17}/>{league.start} · 9:30–11 PM</p>
                <p><MapPin size={17}/>Sofive Carlstadt</p>
                <p className="featuredLeagueNote">Planned league · {league.day} · Details subject to confirmation</p>
                <span className="featuredAction">SEE LEAGUE DETAILS <ArrowRight size={18}/></span>
              </div>
            </a>
          ))}
          {charityUpcoming && <a className="featuredCard featuredCharity" href="/play-for-carmita">
            <div className="featuredCardVisual"><Trophy size={38}/><span>FEATURED CHARITY EVENT</span></div>
            <div className="featuredCardBody">
              <span className="featuredCategory">COMPETE · COMMUNITY</span>
              <h3>Play for Carmita</h3>
              <p><CalendarDays size={17}/>Saturday, October 31 · 9 AM–1 PM</p>
              <p><MapPin size={17}/>Harrison High School · Harrison, NJ</p>
              <span className="featuredAction">EXPLORE EVENT &amp; REGISTER <ArrowRight size={18}/></span>
            </div>
          </a>}
          {featuredGames.length===0 && !charityUpcoming && <div className="featuredEmpty">More games and events are coming soon. <a href="/play">Explore Play →</a></div>}
        </div>
      </section>
      <section className="section" id="play" style={{ display: 'none' }}>
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
