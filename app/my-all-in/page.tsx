'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

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
  const [upcoming,setUpcoming]=useState<Array<{id:string;title:string;venue:string;starts_at:string;status:string;payment_status:string;payment_reference:string|null}>>([]);
  const [upcomingLoading,setUpcomingLoading]=useState(true);
  const [upcomingError,setUpcomingError]=useState(false);
  const [player, setPlayer] = useState<{
    id: number;
    full_name: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPlayer() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) {
        console.error('Supabase public configuration is missing.');
        if (active) window.location.replace('/');
        return;
      }
      const supabase = createClient(url, key);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (active) window.location.replace('/');
        return;
      }
      const response = await fetch('/api/player', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (response.ok) {
        const profile = await response.json();
        if (active) setPlayer(profile);
        try {
          const regResponse=await fetch('/api/registrations',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
          if(!regResponse.ok)throw Error('Registrations unavailable');
          const regData=await regResponse.json();
          const registrations=(regData.registrations||[]) as Array<{id:string;game_id:string;status:string;payment_status:string;payment_reference:string|null}>;
          const ids=[...new Set(registrations.map(reg=>reg.game_id))];
          if(ids.length){
            const gamesResponse=await fetch('/api/my-games',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
            if(!gamesResponse.ok)throw Error('Games unavailable');
            const gamesData=await gamesResponse.json();
            const gameMap=new Map<string,{id:string;title:string;venue:string;starts_at:string}>(
              (gamesData.games||[]).map((g:{id:string;title:string;venue:string;starts_at:string})=>[g.id,g])
            );
            const upcomingGames=registrations.filter(reg=>!['cancelled','expired'].includes(reg.status))
              .map(reg=>({ ...reg,game:gameMap.get(reg.game_id) }))
              .filter(entry=>entry.game && new Date(entry.game.starts_at)>new Date())
              .map(entry=>({...entry.game!,id:entry.id,status:entry.status,payment_status:entry.payment_status,payment_reference:entry.payment_reference}))
              .sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime());
            if(active)setUpcoming(upcomingGames);
          }
        }catch{if(active)setUpcomingError(true);}
        finally{if(active)setUpcomingLoading(false);}
      } else if (active) {
        window.location.replace('/');
      }
    }
    void loadPlayer();
    return () => { active = false; };
  }, []);
  
  return (
    <main className="myAllInPage">
      <nav className="myAllInNav">
        <a href="/" className="myAllInBrand">
         <img src="/all-in-sports-future.png" alt="All In Sports" />
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
            <h2>{player?.full_name || 'PLAYER'}</h2>
              <p>YOUR ALL IN PROFILE</p>
            </div>

         <img src="/all-in-sports-future.png" alt="All In Sports" />
          </div>

          <div className="playerIdentity">
            <div className="playerNumber">
              <span>PLAYER</span>
             <strong>
  #{player?.id ? String(player.id).padStart(4, '0') : '----'}
</strong>
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

            <p className="cardEyebrow">MY UPCOMING GAMES</p>
            {upcomingLoading ? <p>Loading your registrations…</p> :
              upcomingError ? <p role="alert">Unable to load your games right now. Please refresh.</p> :
              <div>
                {([
                  {label:'PENDING PAYMENT',subtitle:'Signed up — payment not yet verified',items:upcoming.filter(g=>['pending_payment','offered'].includes(g.status)&&g.payment_status!=='paid')},
                  {label:'CONFIRMED — YOU’RE IN!',subtitle:'Payment verified and reservation confirmed',items:upcoming.filter(g=>g.status==='confirmed'&&g.payment_status==='paid')},
                  {label:'WAITLIST',subtitle:'Waiting for a spot to become available',items:upcoming.filter(g=>g.status==='waitlisted')},
                ]).map(bucket=><div key={bucket.label} style={{margin:'18px 0',padding:'16px',border:'1px solid #39414d',borderRadius:12}}>
                  <h3 style={{margin:'0 0 6px'}}>{bucket.label} ({bucket.items.length})</h3>
                  <p style={{fontSize:13,opacity:.75}}>{bucket.subtitle}</p>
                  {bucket.items.length===0 ? <p style={{fontSize:14,opacity:.7}}>No games in this section.</p> :
                    bucket.items.map(game=><div key={game.id} style={{padding:'12px 0',borderTop:'1px solid #39414d'}}>
                      <strong>{game.title}</strong>
                      <p>{game.venue} · {new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'})}</p>
                      <p>{game.status==='waitlisted'?'Waitlisted — not reserved':game.payment_status==='pending_verification'?'Zelle reported — awaiting verification':game.status==='confirmed'?'Paid and confirmed':'Payment due — not fully confirmed'}</p>
                      {game.payment_reference&&<p>Reference: {game.payment_reference}</p>}
                      {bucket.label==='PENDING PAYMENT'&&<a href="/play" style={{color:'#95d9ff'}}>VIEW PAYMENT OPTIONS →</a>}
                    </div>)}
                </div>)}
                {upcoming.some(g=>!['waitlisted','pending_payment','offered'].includes(g.status)&&!(g.status==='confirmed'&&g.payment_status==='paid'))&&
                  <p role="status">Some registrations need review. Contact All In Sports if a payment is missing.</p>}
              </div>}
            <a href="/play" className="dashboardAction">
              FIND A GAME
              <ArrowRight size={17} />
            </a>
          </section>

          <section className="dashboardCard">
            <div className="dashboardCardIcon">
              <BarChart3 size={22} />
            </div>

            <p className="cardEyebrow">MY SEASON</p>
            <h3>Your stats start here.</h3>
            <p>Stats are recorded from the launch of Player IDs onward. Previous games, goals, assists, and wins are not backfilled.</p>

            <div className="seasonStats">
              <div>
                <strong>0</strong>
                <span>RECORDED GAMES</span>
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
                <span>RECORDED WINS</span>
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
              <p>Past championship titles can be added after we verify the winning team's roster. Other stats begin at zero.</p>
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
