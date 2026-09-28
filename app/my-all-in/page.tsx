import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Camera,
  Lock,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

export default function MyAllInPage() {
  return (
    <main className="myAllInPage">
      <nav className="myAllInNav">
        <a href="/" className="myAllInBrand">
          <img src="/all-in-logo.svg" alt="All In Sports" />
        </a>

        <a href="/" className="backHome">
          <ArrowLeft size={17} />
          BACK TO ALL IN
        </a>
      </nav>

      <section className="playerDashboard">
        <div className="dashboardIntro">
          <div>
            <p className="eyebrow">MY ALL IN</p>
            <h1>
              YOUR GAME.
              <br />
              <span>YOUR STORY.</span>
            </h1>
          </div>

          <p>
            Your home for games, teams, stats, achievements and everything
            you build with All In.
          </p>
        </div>

        <section className="playerIdCard">
          <div className="playerIdGlow" />

          <div className="playerIdTop">
            <div>
              <span className="playerIdLabel">ALL IN // PLAYER ID</span>
              <h2>PLAYER</h2>
              <p>YOUR ALL IN PROFILE</p>
            </div>

            <img src="/all-in-logo.svg" alt="" />
          </div>

          <div className="playerIdentity">
            <div className="playerNumber">
              <span>PLAYER</span>
              <strong>#----</strong>
            </div>

            <div className="aiRating">
              <span>AI RATING</span>
              <strong>UNRATED</strong>
            </div>
          </div>

          <div className="playerIdBottom">
            <span>ALL IN SPORTS</span>
            <span>PROFILE ACTIVATED</span>
          </div>
        </section>

        <div className="dashboardGrid">
          <section className="dashboardCard nextGameCard">
            <div className="dashboardCardIcon">
              <CalendarDays size={22} />
            </div>

            <p className="cardEyebrow">NEXT UP</p>
            <h3>No upcoming game yet.</h3>
            <p>
              Your next All In game will appear here when you're registered.
            </p>

            <a href="/#play" className="dashboardAction">
              FIND A GAME
              <ArrowRight size={17} />
            </a>
          </section>

          <section className="dashboardCard">
            <div className="dashboardCardIcon">
              <BarChart3 size={22} />
            </div>

            <p className="cardEyebrow">MY SEASON</p>
            <h3>The story starts here.</h3>

            <div className="seasonStats">
              <div>
                <strong>0</strong>
                <span>GAMES</span>
              </div>
              <div>
                <strong>—</strong>
                <span>GOALS</span>
              </div>
              <div>
                <strong>—</strong>
                <span>ASSISTS</span>
              </div>
              <div>
                <strong>0</strong>
                <span>WINS</span>
              </div>
            </div>
          </section>
        </div>

        <section className="dashboardWideCard">
          <div className="wideCardHeading">
            <div className="dashboardCardIcon">
              <Users size={22} />
            </div>

            <div>
              <p className="cardEyebrow">MY TEAMS & LEAGUES</p>
              <h3>Your All In journey.</h3>
            </div>
          </div>

          <div className="emptyState">
            <Shield size={28} />
            <p>
              Teams, leagues and championship history connected to your
              Player ID will live here.
            </p>
          </div>
        </section>

        <section className="intelligenceDashboard">
          <div>
            <div className="intelligenceTitle">
              <Sparkles size={20} />
              <span>ALL IN INTELLIGENCE</span>
            </div>

            <h2>
              YOUR GAME.
              <br />
              <span>UNLOCKED.</span>
            </h2>

            <p>
              We're building toward turning All In game footage into player
              stats, ratings, insights and highlights.
            </p>
          </div>

          <div className="intelligenceStatus">
            <Zap size={25} />
            <span>AI RATING</span>
            <strong>UNRATED</strong>
            <small>PLAY TO BUILD YOUR PROFILE</small>
          </div>
        </section>

        <section className="dashboardWideCard">
          <div className="wideCardHeading">
            <div className="dashboardCardIcon">
              <Trophy size={22} />
            </div>

            <div>
              <p className="cardEyebrow">ACHIEVEMENTS</p>
              <h3>Earn your legacy.</h3>
            </div>
          </div>

          <div className="achievementGrid">
            <div>
              <Lock size={20} />
              <strong>FIRST MATCH</strong>
            </div>
            <div>
              <Lock size={20} />
              <strong>FIRST GOAL</strong>
            </div>
            <div>
              <Lock size={20} />
              <strong>PLAYER OF THE MATCH</strong>
            </div>
            <div>
              <Lock size={20} />
              <strong>CHAMPION</strong>
            </div>
          </div>
        </section>

        <section className="dashboardWideCard">
          <div className="wideCardHeading">
            <div className="dashboardCardIcon">
              <Camera size={22} />
            </div>

            <div>
              <p className="cardEyebrow">MY HIGHLIGHTS</p>
              <h3>Your moments. One place.</h3>
            </div>
          </div>

          <div className="emptyState">
            <Camera size={28} />
            <p>
              Goals, saves, assists and memorable moments will eventually
              connect directly to your Player ID.
            </p>
          </div>
        </section>
      </section>

      <footer className="myAllInFooter">
        <img src="/all-in-logo.svg" alt="All In Sports" />
        <span>PLAY. COMPETE. CONNECT.</span>
      </footer>
    </main>
  );
}
