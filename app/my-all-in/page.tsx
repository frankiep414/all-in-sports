'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Camera,
  LogOut,
  Lock,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

export default function MyAllInPage() {
  const [signingOut, setSigningOut] = useState(false);
  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) { setSigningOut(false); window.alert('Sign out is temporarily unavailable.'); return; }
    try {
      const supabase = createClient(url, key);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      localStorage.removeItem('allInPlayerId');
      window.location.replace('/?auth=1');
    } catch {
      window.alert('Unable to sign out. Please try again.');
      setSigningOut(false);
    }
  }
  const [upcoming,setUpcoming]=useState<Array<{id:string;title:string;venue:string;starts_at:string;status:string;payment_status:string;payment_reference:string|null;game_id:string;registration_type?:string;team_name?:string|null;spots_reserved?:number}>>([]);
  const [upcomingLoading,setUpcomingLoading]=useState(true);
  const [upcomingError,setUpcomingError]=useState(false);
  const [withdrawBusy,setWithdrawBusy]=useState<string|null>(null);
  const [withdrawMessage,setWithdrawMessage]=useState('');
  async function withdrawRegistration(game:{id:string;title:string;payment_status:string}){
    const paid=game.payment_status==='paid';
    const warning=paid
      ? 'Withdrawing from this game does not automatically issue a refund. Please contact All In Sports management regarding any reimbursement.'
      : 'Withdraw from this game? Your registration will be cancelled and your spot released.';
    if(!window.confirm(game.title+'\\n\\n'+warning))return;
    setWithdrawBusy(game.id);setWithdrawMessage('');
    try{
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if(!url||!key)throw new Error('Sign-in unavailable.');
      const client=createClient(url,key);
      const {data:{session}}=await client.auth.getSession();
      if(!session?.access_token){window.location.assign('/?auth=1&returnTo=%2Fmy-all-in');return;}
      const response=await fetch('/api/registrations',{method:'DELETE',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({registration_id:game.id})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Unable to withdraw.');
      setUpcoming(current=>current.filter(item=>item.id!==game.id));
      setWithdrawMessage(paid?'Withdrawal recorded. Contact All In Sports management for any reimbursement. No refund has been issued.':'Withdrawal recorded. Your spot has been released.');
    }catch(error){setWithdrawMessage(error instanceof Error?error.message:'Unable to withdraw.');}
    finally{setWithdrawBusy(null);}
  }

  const [player, setPlayer] = useState<{
    id: number;
    full_name: string;
  } | null>(null);

  const [airSessions,setAirSessions]=useState<Array<{session_date:string;air_rating:number;source_label:string;fixtures_played:number|null;goals:number|null;assists:number|null;saves:number|null;shots_against:number|null;passes_completed:number|null;passes_attempted:number|null;shots:number|null;shots_on_target:number|null;key_passes:number|null;tackles:number|null;interceptions:number|null;performance_summary:string|null}>>([]);
  const [overallAir,setOverallAir]=useState<number|null>(null);
  const [overallStatus,setOverallStatus]=useState('unrated');
  const [careerGames,setCareerGames]=useState<number|null>(null);
  const [careerGoals,setCareerGoals]=useState<number|null>(null);
  const [careerAssists,setCareerAssists]=useState<number|null>(null);
  const [careerSaves,setCareerSaves]=useState<number|null>(null);
  const [careerPassAccuracy,setCareerPassAccuracy]=useState<number|null>(null);
  const [isGoalkeeper,setIsGoalkeeper]=useState(false);
  const [airLoading,setAirLoading]=useState(true);
  const [airError,setAirError]=useState(false);
  useEffect(()=>{
    let active=true;
    (async()=>{
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if(!url||!key)throw new Error('AIR configuration unavailable');
      const client=createClient(url,key);
      const {data:{session}}=await client.auth.getSession();
      if(!session?.access_token)throw new Error('AIR sign-in unavailable');
      const response=await fetch('/api/player/air-sessions',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
      if(!response.ok)throw new Error('AIR history unavailable');
      const result=await response.json();if(active){setAirSessions(result.sessions||[]);setOverallAir(result.overall_air);setOverallStatus(result.overall_status||'unrated');setCareerGames(result.games_complete && typeof result.games_played==='number'?result.games_played:null);setCareerGoals(typeof result.career_goals==='number'?result.career_goals:null);setCareerAssists(typeof result.career_assists==='number'?result.career_assists:null);setCareerSaves(typeof result.career_saves==='number'?result.career_saves:null);setCareerPassAccuracy(typeof result.goalkeeper_pass_accuracy==='number'?result.goalkeeper_pass_accuracy:null);setIsGoalkeeper(result.player_position==='goalkeeper');}
    })().catch(()=>{if(active)setAirError(true);}).finally(()=>{if(active)setAirLoading(false);});
    return()=>{active=false;};
  },[]);
  const overallAirLabel=airLoading?'LOADING':airError?'UNAVAILABLE':overallAir===null?'UNRATED':Number(overallAir).toFixed(2);
  const [editingName,setEditingName]=useState(false);
  const [nameDraft,setNameDraft]=useState('');
  const [savingName,setSavingName]=useState(false);
  const [nameMessage,setNameMessage]=useState('');
  async function saveName(){
   setSavingName(true);setNameMessage('');
   try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if(!url||!key)throw new Error('Sign-in unavailable.');
    const client=createClient(url,key);
    const {data:{session}}=await client.auth.getSession();
    if(!session?.access_token)throw new Error('Please sign in again.');
    const response=await fetch('/api/player',{method:'PATCH',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({full_name:nameDraft})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Unable to save name.');
    const verify=await fetch('/api/player',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
    if(!verify.ok)throw new Error('Name saved, but verification failed. Refresh to check your profile.');
    const savedProfile=await verify.json();
    if(savedProfile.full_name!==result.player.full_name)throw new Error('Name update could not be verified. Please try again.');
    setPlayer(current=>current?{...current,full_name:savedProfile.full_name}:current);
    setEditingName(false);setNameMessage('Name updated successfully.');
   }catch(error){setNameMessage(error instanceof Error?error.message:'Unable to update name.');}
   finally{setSavingName(false);}
  }

  useEffect(() => {
    let active = true;
    async function loadPlayer() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) {
        console.error('Supabase public configuration is missing.');
        if (active) window.location.replace('/?auth=1');
        return;
      }
      const supabase = createClient(url, key);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (active) window.location.replace('/?auth=1');
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
          const registrations=(regData.registrations||[]) as Array<{id:string;game_id:string;status:string;payment_status:string;payment_reference:string|null;registration_type?:string;team_name?:string|null;spots_reserved?:number}>;
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
              .map(entry=>({...entry.game!,id:entry.id,game_id:entry.game_id,status:entry.status,payment_status:entry.payment_status,payment_reference:entry.payment_reference,registration_type:entry.registration_type,team_name:entry.team_name,spots_reserved:entry.spots_reserved}))
              .sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime());
            if(active)setUpcoming(upcomingGames);
          }
        }catch{if(active)setUpcomingError(true);}
        finally{if(active)setUpcomingLoading(false);}
      } else if (active) {
        window.location.replace('/?auth=1');
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

        <button type="button" onClick={() => { void handleSignOut(); }} disabled={signingOut} style={{marginLeft:'auto',marginRight:12,display:'inline-flex',alignItems:'center',gap:8,padding:'10px 13px',background:'#192331',color:'#fff',border:'1px solid #41546a',borderRadius:9,fontWeight:700,cursor:'pointer'}}><LogOut size={16}/>{signingOut?'SIGNING OUT…':'LOG OUT'}</button>
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
              <button type="button" onClick={()=>{setNameDraft(player?.full_name||'');setNameMessage('');setEditingName(true);}} style={{marginTop:8,padding:'8px 12px',border:'1px solid #95d9ff',borderRadius:8,background:'#152638',color:'#b4e6ff',fontWeight:700}}>EDIT NAME</button>
              {editingName&&<div style={{marginTop:10,display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}><input aria-label="Full name" value={nameDraft} onChange={e=>setNameDraft(e.target.value)} maxLength={100} style={{padding:10,borderRadius:8,border:'1px solid #7a93aa',background:'#101820',color:'#fff',minWidth:220}}/><button type="button" disabled={savingName} onClick={()=>void saveName()} style={{padding:10,borderRadius:8,background:'#b4e6ff',color:'#111',fontWeight:700}}>{savingName?'SAVING…':'SAVE'}</button><button type="button" disabled={savingName} onClick={()=>setEditingName(false)} style={{padding:10,borderRadius:8}}>CANCEL</button></div>}
              {nameMessage&&<p role="status" style={{color:'#b4e6ff',marginTop:8}}>{nameMessage}</p>}
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
              <span>OVERALL AIR</span>
              <strong>{overallAirLabel}</strong>
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
            {withdrawMessage&&<p role="status" style={{color:'#95d9ff'}}>{withdrawMessage}</p>}
            {upcomingLoading ? <p>Loading your registrations…</p> :
              upcomingError ? <p role="alert">Unable to load your games right now. Please refresh.</p> :
              <div>
                {([
                  {label:'PENDING PAYMENT',subtitle:'Registered · Payment not yet verified',items:upcoming.filter(g=>['pending_payment','offered'].includes(g.status)&&g.payment_status!=='paid')},
                  {label:'CONFIRMED — YOU’RE IN!',subtitle:'Paid · Spot fully reserved',items:upcoming.filter(g=>g.status==='confirmed'&&g.payment_status==='paid')},
                  {label:'WAITLIST',subtitle:'Waiting for an available spot',items:upcoming.filter(g=>g.status==='waitlisted')},
                ]).map(bucket=><section key={bucket.label} style={{margin:'16px 0',border:'1px solid #303945',borderRadius:14,overflow:'hidden',background:'#101821'}}>
                  <div style={{padding:'15px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                    <div>
                      <h3 style={{fontSize:16,margin:'0 0 3px',letterSpacing:1}}>{bucket.label}</h3>
                      <span style={{fontSize:12,color:'#a9b9c8'}}>{bucket.subtitle}</span>
                    </div>
                    <strong style={{fontSize:20,color:'#95d9ff',background:'#1b2c3a',borderRadius:10,padding:'6px 12px'}}>{bucket.items.length}</strong>
                  </div>
                  {bucket.items.length===0 ? <p style={{fontSize:13,color:'#a9b9c8',padding:'0 18px 16px',margin:0}}>No games here yet.</p> :
                    bucket.items.map(game=><details key={game.id} style={{borderTop:'1px solid #303945'}}>
                      <summary style={{cursor:'pointer',padding:'14px 18px',listStyle:'none',display:'flex',justifyContent:'space-between',alignItems:'center',gap:14}}>
                        <span style={{minWidth:0,flex:1}}>
                          <strong style={{display:'block',fontSize:15,lineHeight:1.4,overflowWrap:'anywhere'}}>{game.title}</strong>
                          <span style={{display:'block',fontSize:13,color:'#a9b9c8',marginTop:4}}>{new Date(game.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span>
                        </span>
                        <span style={{color:'#95d9ff',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>DETAILS ＋</span>
                      </summary>
                      <div style={{padding:'0 18px 18px',fontSize:14,lineHeight:1.6,color:'#d8e3ee'}}>
                        <p style={{margin:'0 0 8px'}}>📍 {game.venue}</p>
                        <p style={{margin:'0 0 8px'}}>{game.status==='waitlisted'?'Waitlisted — no spot reserved':game.payment_status==='pending_verification'?'Zelle reported — awaiting verification':game.status==='confirmed'?'Payment verified — reservation confirmed':'Payment due — reservation not yet confirmed'}</p>
                        {game.registration_type==='team'&&<p style={{margin:'0 0 8px'}}>Team: <strong>{game.team_name}</strong> · 5 players reserved under your Player ID</p>}
                        {game.payment_reference&&<p style={{margin:'0 0 12px'}}>Payment reference: <strong>{game.payment_reference}</strong></p>}
                        {bucket.label==='PENDING PAYMENT'&&<a href={`/play?game=${encodeURIComponent(game.game_id)}`} style={{color:'#95d9ff',fontWeight:700,textDecoration:'none'}}>VIEW PAYMENT OPTIONS →</a>}
                        {game.payment_status==='paid'&&<p style={{color:'#ffd7a1',fontSize:13,margin:'10px 0'}}>Withdrawal does not automatically issue a refund. Contact All In Sports management regarding reimbursement.</p>}
                        <div style={{marginTop:14}}>
                          <button type="button" disabled={withdrawBusy!==null} onClick={()=>void withdrawRegistration(game)}
                            style={{background:'transparent',border:'1px solid #d18b8b',color:'#ffb3b3',borderRadius:8,padding:'9px 13px',fontWeight:700,cursor:'pointer'}}>
                            {withdrawBusy===game.id?'WITHDRAWING…':game.status==='waitlisted'?'LEAVE WAITLIST':'WITHDRAW FROM GAME'}
                          </button>
                        </div>
                      </div>
                    </details>)}
                </section>)}
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
            <h3>Your career stats</h3>
            <p>Career totals from verified AIR sessions. A dash means the statistic has not yet been fully verified.</p>

            <div className="seasonStats">
              <div>
                <strong>{airLoading?'…':airError?'—':careerGames??'—'}</strong>
                <span>RECORDED GAMES</span>
              </div>
              <div>
                <strong>{airLoading?'…':airError?'—':(isGoalkeeper?careerSaves:careerGoals)??'—'}</strong>
                <span>{isGoalkeeper?'SAVES':'GOALS'}</span>
              </div>
              <div>
                <strong>{airLoading?'…':airError?'—':isGoalkeeper?(careerPassAccuracy===null?'—':`${careerPassAccuracy}%`):(careerAssists??'—')}</strong>
                <span>{isGoalkeeper?'PASS %':'ASSISTS'}</span>
              </div>
              <div>
                <strong>—</strong>
                <span>RECORDED WINS</span>
              </div>
            </div>
          </section>
        </div>

        <section className="dashboardWideCard">
          <div className="wideCardHeading"><div className="dashboardCardIcon"><BarChart3 size={22}/></div><div><p className="cardEyebrow">AIR · ALL IN RATING</p><h3>My session ratings</h3><p>{overallStatus==='provisional'?'Overall AIR is provisional until more verified sessions and game counts are recorded.':overallStatus==='established'?'Overall AIR uses a games-weighted average of verified sessions.':'Your overall rating will appear after a verified session.'}</p></div></div>
          {airLoading?<p>Loading your AIR history…</p>:airError?<p role="alert">Unable to load your ratings right now. Please refresh.</p>:airSessions.length===0?<p>No verified AIR sessions linked to your profile yet.</p>:
            <div style={{display:'grid',gap:12,marginTop:16}}>
              {airSessions.map(session=>{
                const stats=[
                  ['Appearances',session.fixtures_played],
                  ['Goals',session.goals],['Assists',session.assists],
                  ['Shots',session.shots],['Shots on target',session.shots_on_target],
                  ['Key passes',session.key_passes],['Tackles',session.tackles],
                  ['Interceptions',session.interceptions],['Saves',session.saves],
                  ['Shots against',session.shots_against],
                  ['Passes completed',session.passes_completed],['Passes attempted',session.passes_attempted],
                  ['Pass accuracy',typeof session.passes_attempted==='number'&&session.passes_attempted>0&&typeof session.passes_completed==='number'?Math.round(100*session.passes_completed/session.passes_attempted)+'%':null]
                ].filter((entry):entry is [string,number|string]=>entry[1]!==null&&entry[1]!==undefined);
                return <details key={session.session_date+'-'+session.source_label} style={{border:'1px solid #36516a',borderRadius:12,overflow:'hidden'}}>
                  <summary style={{cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:16}}>
                    <span><strong style={{display:'block'}}>{new Date(session.session_date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</strong><span style={{fontSize:12,color:'#a9b9c8'}}>VIEW SESSION STATS ▾</span></span>
                    <strong style={{fontSize:26,color:'#65df9c'}}>{Number(session.air_rating).toFixed(2)}</strong>
                  </summary>
                  <div style={{borderTop:'1px solid #36516a',padding:16}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(125px,1fr))',gap:10}}>
                      {stats.map(([label,value])=><div key={label} style={{background:'#152638',borderRadius:10,padding:12}}><strong style={{display:'block',fontSize:23,color:'#fff'}}>{value}</strong><span style={{fontSize:12,color:'#b4d9ed'}}>{label}</span></div>)}
                    </div>
                    {stats.length===0&&<p>Detailed statistics have not been verified for this session yet.</p>}
                    {session.performance_summary&&<p style={{marginTop:16,lineHeight:1.6}}><strong>Performance summary</strong><br/>{session.performance_summary}</p>}
                    <p style={{fontSize:12,color:'#a9b9c8',marginTop:14}}>Only recorded session statistics are displayed. Missing data is not treated as zero.</p>
                  </div>
                </details>;
              })}
            </div>}
        </section>
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
            <span>OVERALL AIR</span>
            <strong>{overallAirLabel}</strong>
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
