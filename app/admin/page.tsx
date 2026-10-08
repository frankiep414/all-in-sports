'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type PickupGame = {id:string;title:string;venue:string;starts_at:string;ends_at:string;price_cents:number;capacity:number;status:string;series_id?:string|null;occurrence_index?:number|null};
type Status = 'loading' | 'authorized' | 'denied' | 'error';

export default function AdminPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [saving,setSaving] = useState(false);
  const [repeatWeekly,setRepeatWeekly]=useState(false);
  const [weeks,setWeeks]=useState(8);
  const [games,setGames] = useState<PickupGame[]>([]);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [editGame,setEditGame]=useState({title:'',venue:'',date:'',start:'',end:'',price:'',capacity:''});
  const [editSaving,setEditSaving]=useState(false);
  const [editMessage,setEditMessage]=useState('');
  const [editRepeat,setEditRepeat]=useState(false);
  const [editWeeks,setEditWeeks]=useState(8);
  const [draftActionBusy,setDraftActionBusy]=useState(false);
  async function draftAction(item:PickupGame,action:'convert'|'delete') {
    const description=action==='delete'
      ?`Permanently delete draft "${item.title}"? This cannot be undone.`
      :`Convert "${item.title}" into ${editWeeks} weekly draft games, including the original? This will create ${editWeeks-1} new drafts.`;
    if(!window.confirm(description))return;
    setDraftActionBusy(true);setEditMessage('');
    try {
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if(!url||!key)throw new Error('Authentication unavailable.');
      const client=createClient(url,key);
      const {data:{session}}=await client.auth.getSession();
      if(!session?.access_token)throw new Error('Please sign in again.');
      const response=await fetch('/api/admin/games',{method:action==='delete'?'DELETE':'PUT',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
        body:JSON.stringify({id:item.id,...(action==='convert'?{weeks:editWeeks}:{})})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Unable to update draft.');
      await loadGames(session.access_token);
      setEditingId(null);setEditRepeat(false);
      setEditMessage(action==='delete'?'Draft deleted.':`Converted to ${editWeeks} weekly drafts. Your original game is week one.`);
    }catch(error){setEditMessage(error instanceof Error?error.message:'Unable to update draft.');}
    finally{setDraftActionBusy(false);}
  }
  async function changeStatus(item:PickupGame,action:'publish'|'cancel'){
    const question=action==='publish'
      ?`Publish "${item.title}" to the public Play page? Registration and payment will remain closed.`
      :`Cancel "${item.title}"? It will disappear from the public Play page.`;
    if(!window.confirm(question))return;
    setDraftActionBusy(true);setEditMessage('');
    try{
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if(!url||!key)throw new Error('Authentication unavailable.');
      const client=createClient(url,key);
      const {data:{session}}=await client.auth.getSession();
      if(!session?.access_token)throw new Error('Please sign in again.');
      const response=await fetch('/api/admin/games',{method:'PATCH',
       headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
       body:JSON.stringify({id:item.id,action})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Unable to change game status.');
      await loadGames(session.access_token);
      setEditMessage(action==='publish'?'Game published on the preview Play page. Registration remains closed.':'Game cancelled.');
    }catch(error){setEditMessage(error instanceof Error?error.message:'Unable to update game.');}
    finally{setDraftActionBusy(false);}
  }
  function beginEdit(item:PickupGame) {
    const format=(iso:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));
    const pieces=(iso:string)=>Object.fromEntries(format(iso).map(part=>[part.type,part.value]));
    const start=pieces(item.starts_at),end=pieces(item.ends_at);
    setEditGame({title:item.title,venue:item.venue,date:`${start.year}-${start.month}-${start.day}`,
      start:`${start.hour}:${start.minute}`,end:`${end.hour}:${end.minute}`,
      price:(item.price_cents/100).toFixed(2),capacity:String(item.capacity)});
    setEditingId(item.id);setEditRepeat(false);setEditWeeks(8);setEditMessage('');
  }
  async function saveEdit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!editingId)return;
    setEditSaving(true);setEditMessage('');
    try {
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if(!url||!key)throw new Error('Authentication unavailable.');
      const client=createClient(url,key);
      const {data:{session}}=await client.auth.getSession();
      if(!session?.access_token)throw new Error('Please sign in again.');
      const start=new Date(`${editGame.date}T${editGame.start}`);
      const end=new Date(`${editGame.date}T${editGame.end}`);
      if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)
        throw new Error('End time must be after start time.');
      const response=await fetch('/api/admin/games',{method:'PATCH',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
        body:JSON.stringify({id:editingId,title:editGame.title,venue:editGame.venue,
          starts_at:start.toISOString(),ends_at:end.toISOString(),
          price_cents:Math.round(Number(editGame.price)*100),capacity:Number(editGame.capacity)})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Unable to update game.');
      await loadGames(session.access_token);
      setEditingId(null);setEditMessage('Game updated successfully.');
    }catch(error){setEditMessage(error instanceof Error?error.message:'Unable to update game.');}
    finally{setEditSaving(false);}
  }
  const [gamesError,setGamesError] = useState('');
  async function loadGames(token:string) {
    const response=await fetch('/api/admin/games',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
    if(!response.ok) {setGamesError('Unable to load games.');return;}
    const result=await response.json();
    setGames(result.games || []);
    setGamesError('');
  }
  const [message,setMessage] = useState('');
  const [game,setGame] = useState({title:'',venue:'',date:'',start:'',end:'',price:'20',capacity:'20'});
  async function createDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage('');
    try {
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) throw new Error('Authentication configuration unavailable.');
      const supabase=createClient(url,key);
      const {data:{session}}=await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in again.');
      const start=new Date(`${game.date}T${game.start}`);
      const end=new Date(`${game.date}T${game.end}`);
      const priceNumber=Number(game.price);
      const capacityNumber=Number(game.capacity);
      if (!Number.isFinite(priceNumber) || !Number.isFinite(capacityNumber)) throw new Error('Enter valid price and capacity.');
      const response=await fetch('/api/admin/games',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
        body:JSON.stringify({title:game.title,venue:game.venue,starts_at:start.toISOString(),ends_at:end.toISOString(),price_cents:Math.round(priceNumber*100),capacity:capacityNumber,
          repeat_weekly:repeatWeekly,weeks:repeatWeekly?weeks:1,
          local_start:`${game.date}T${game.start}`,local_end:`${game.date}T${game.end}`})
      });
      const result=await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save game.');
      setMessage(repeatWeekly?`${weeks} weekly game drafts saved successfully. None are published.`:'Game draft saved successfully. It is not published.');
      await loadGames(session.access_token);
      setGame({title:'',venue:'',date:'',start:'',end:'',price:'20',capacity:'20'});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save game.');
    } finally {setSaving(false);}
  }
  useEffect(() => {
    let active = true;
    async function checkAccess() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) throw new Error('Configuration unavailable');
        const supabase = createClient(url, key);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          if (active) setStatus('denied');
          return;
        }
        const response = await fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (active) setStatus(response.ok ? 'authorized' : response.status === 401 || response.status === 403 ? 'denied' : 'error');
        if (response.ok && active) await loadGames(session.access_token);
      } catch {
        if (active) setStatus('error');
      }
    }
    void checkAccess();
    return () => { active = false; };
  }, []);

  return (
    <main style={{minHeight:'100vh',background:'#080b10',color:'#f6f8fb',padding:'clamp(24px,5vw,72px)'}}>
      <nav style={{display:'flex',justifyContent:'space-between',gap:16,marginBottom:64,flexWrap:'wrap'}}>
        <Link href="/" style={{color:'#95d9ff',fontWeight:800,textDecoration:'none'}}>← ALL IN SPORTS</Link>
        <Link href="/play" style={{color:'#fff',textDecoration:'none'}}>VIEW PLAY PAGE →</Link>
      </nav>
      <section style={{maxWidth:1000,margin:'0 auto'}}>
        {status==='loading' && <p role="status">Checking administrator access…</p>}
        {status==='denied' && <div role="alert"><h1>Administrator access required</h1><p>Please sign in with an authorized All In Sports administrator account.</p><Link href="/">Return to sign in</Link></div>}
        {status==='error' && <div role="alert"><h1>Unable to verify access</h1><p>Please try again later. No administrator data has been loaded.</p></div>}
        {status==='authorized' && <>
          <p style={{color:'#95d9ff',letterSpacing:3,fontWeight:800}}>ALL IN SPORTS // ADMIN</p>
          <h1 style={{fontSize:'clamp(38px,7vw,72px)',margin:'12px 0'}}>Command Center</h1>
          <p style={{color:'#b8c1d0',fontSize:18}}>Manage your games, registrations, and payments in one place.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:16,marginTop:40}}>
            {[
              ['Games','Create sessions, set pricing and player limits.','DRAFT CREATION READY'],
              ['Registrations','Track players, pending spots and paid rosters.','IN DEVELOPMENT'],
              ['Zelle payments','Verify bank receipts before confirming spots.','IN DEVELOPMENT'],
              ['Stripe payments','Track confirmed checkout payments and refunds.','NOT CONNECTED'],
            ].map(([title,description,tag])=><div key={title} style={{background:'#111820',border:'1px solid #303945',borderRadius:16,padding:24}}>
              <strong style={{fontSize:21}}>{title}</strong><p style={{color:'#b8c1d0',lineHeight:1.6}}>{description}</p><small style={{color:'#95d9ff',fontWeight:800,letterSpacing:1}}>{tag}</small>
            </div>)}
          </div>
          <section style={{marginTop:40,background:'#111820',border:'1px solid #303945',borderRadius:18,padding:26}}>
            <h2 style={{marginTop:0}}>Create a pickup game</h2>
            <p style={{color:'#b8c1d0'}}>Save a draft first. Publishing and player checkout will be added after testing.</p>
            <form onSubmit={createDraft} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
              {([
                ['title','Game title','text'],['venue','Field / location','text'],
                ['date','Game date','date'],['start','Start time','time'],['end','End time','time'],
                ['price','Price per player ($)','number'],['capacity','Player capacity','number']
              ] as const).map(([field,label,type])=><label key={field} style={{display:'grid',gap:7,color:'#dce6f2',fontWeight:600}}>
                {label}<input required type={type} value={game[field]} min={field==='price'?'0':field==='capacity'?'2':undefined} max={field==='capacity'?'100':undefined} step={field==='price'?'0.01':undefined} onChange={e=>setGame(current=>({...current,[field]:e.target.value}))} style={{background:'#080b10',color:'#fff',border:'1px solid #445063',borderRadius:9,padding:12,fontSize:16}}/>
              </label>)}
              <div style={{gridColumn:'1 / -1',display:'grid',gap:12}}>
                <label style={{display:'flex',alignItems:'center',gap:12,fontWeight:700}}>
                  <input type="checkbox" checked={repeatWeekly} onChange={e=>setRepeatWeekly(e.target.checked)} style={{width:20,height:20}}/>
                  Repeat this game every week
                </label>
                {repeatWeekly && <label style={{display:'grid',gap:8,maxWidth:260}}>
                  Number of weeks (2–16)
                  <input type="number" min={2} max={16} step={1} required value={weeks} onChange={e=>setWeeks(Number(e.target.value))}
                    style={{background:'#080b10',color:'#fff',border:'1px solid #445063',borderRadius:9,padding:12,fontSize:16}}/>
                  <small style={{color:'#b8c1d0'}}>Each week is saved as a separate unpublished game. Times use New York time.</small>
                </label>}
              </div>
              <div style={{gridColumn:'1 / -1'}}>
                <button type="submit" disabled={saving} style={{background:'#95d9ff',color:'#08101a',border:0,borderRadius:10,padding:'14px 22px',fontWeight:800,cursor:'pointer'}}>{saving?'Saving…':'SAVE GAME DRAFT'}</button>
                {message && <p role="status" style={{color:'#c8e5fa'}}>{message}</p>}
              </div>
            </form>
          </section>
          <section style={{marginTop:36}}>
            <h2>Saved games</h2>
            {gamesError && <p role="alert">{gamesError}</p>}
            {!gamesError && games.length===0 && <p style={{color:'#b8c1d0'}}>No saved games yet. Create your first draft above.</p>}
            {editMessage && <p role="status" style={{color:'#95d9ff'}}>{editMessage}</p>}
            <div style={{display:'grid',gap:12}}>
              {games.map(item=><article key={item.id} style={{border:'1px solid #303945',borderRadius:14,padding:20,background:'#111820'}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                  <strong>{item.title}</strong><span style={{color:'#95d9ff',fontWeight:700}}>{item.status.toUpperCase()}</span>
                </div>
                <p style={{color:'#b8c1d0'}}>{item.venue} · {new Date(item.starts_at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}</p>
                {item.series_id && <p style={{color:'#95d9ff',marginBottom:8}}>Weekly series · Game {item.occurrence_index}</p>}
                <p style={{marginBottom:0}}>Price: ${(item.price_cents/100).toFixed(2)} · Capacity: {item.capacity} players</p>
                {item.status==='draft' && <button type="button" onClick={()=>beginEdit(item)}
                  style={{marginTop:14,background:'#95d9ff',color:'#08101a',border:0,borderRadius:9,padding:'10px 18px',fontWeight:800,cursor:'pointer'}}>EDIT GAME</button>}

                {item.status==='draft' && <button type="button" disabled={draftActionBusy||editSaving}
                  onClick={()=>void draftAction(item,'delete')}
                  style={{marginTop:14,marginLeft:12,background:'transparent',color:'#ffaaaa',border:'1px solid #7e4444',borderRadius:9,padding:'10px 18px',fontWeight:700,cursor:'pointer'}}>DELETE DRAFT</button>}
                {item.status==='draft' && <button type="button" disabled={draftActionBusy||editSaving}
                  onClick={()=>void changeStatus(item,'publish')}
                  style={{marginTop:14,marginLeft:12,background:'#a9e6b8',color:'#08101a',border:0,borderRadius:9,padding:'10px 18px',fontWeight:800}}>PUBLISH GAME</button>}
                {item.status==='published' && <button type="button" disabled={draftActionBusy}
                  onClick={()=>void changeStatus(item,'cancel')}
                  style={{marginTop:14,background:'transparent',color:'#ffaaaa',border:'1px solid #7e4444',borderRadius:9,padding:'10px 18px',fontWeight:700}}>CANCEL GAME</button>}
                {editingId===item.id && <form onSubmit={saveEdit} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginTop:18,paddingTop:16,borderTop:'1px solid #303945'}}>
                  {([['title','Game title','text'],['venue','Field / location','text'],['date','Game date','date'],
                    ['start','Start time','time'],['end','End time','time'],['price','Price per player ($)','number'],
                    ['capacity','Player capacity','number']] as const).map(([field,label,type])=><label key={field} style={{display:'grid',gap:6}}>
                      {label}<input required type={type} value={editGame[field]} min={field==='price'?'0':field==='capacity'?'2':undefined}
                        max={field==='capacity'?'100':undefined} step={field==='price'?'0.01':undefined}
                        onChange={e=>setEditGame(current=>({...current,[field]:e.target.value}))}
                        style={{background:'#080b10',color:'#fff',border:'1px solid #445063',borderRadius:9,padding:11,fontSize:15}}/>
                    </label>)}

                  {!item.series_id && <div style={{gridColumn:'1 / -1',display:'grid',gap:10}}>
                    <label style={{display:'flex',alignItems:'center',gap:10}}>
                      <input type="checkbox" checked={editRepeat} onChange={e=>setEditRepeat(e.target.checked)}/>
                      Make this game recurring every week
                    </label>
                    {editRepeat && <label style={{display:'grid',gap:6,maxWidth:250}}>
                      Number of weeks (including this game)
                      <input type="number" min={2} max={16} step={1} value={editWeeks}
                        onChange={e=>setEditWeeks(Number(e.target.value))}
                        style={{background:'#080b10',color:'#fff',border:'1px solid #445063',borderRadius:9,padding:11}}/>
                    </label>}
                    {editRepeat && <p style={{margin:0,color:'#b8c1d0'}}>Save any changes to this game first. Then select Make Recurring to create the remaining dates.</p>}
                  </div>}
                  <div style={{gridColumn:'1 / -1',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                    <button type="submit" disabled={editSaving} style={{background:'#95d9ff',color:'#08101a',border:0,borderRadius:9,padding:'11px 18px',fontWeight:800}}>{editSaving?'Saving…':'SAVE CHANGES'}</button>

                    {editRepeat && !item.series_id && <button type="button" disabled={draftActionBusy||editSaving||editWeeks<2||editWeeks>16}
                      onClick={()=>void draftAction(item,'convert')}
                      style={{background:'#a9e6b8',color:'#08101a',border:0,borderRadius:9,padding:'11px 18px',fontWeight:800}}>
                      {draftActionBusy?'Working…':`MAKE RECURRING (${editWeeks} WEEKS)`}
                    </button>}
                    <button type="button" onClick={()=>{setEditingId(null);setEditMessage('');}} style={{background:'transparent',color:'#fff',border:'1px solid #445063',borderRadius:9,padding:'11px 18px'}}>CANCEL</button>
                  </div>

                  <p style={{gridColumn:'1 / -1',color:'#b8c1d0',margin:0}}>Saving edits updates only this game. Make Recurring uses the currently saved details.</p>
                </form>}
              </article>)}
            </div>
          </section>
          <p style={{color:'#b8c1d0',marginTop:32}}>Draft games can be published to the Play page. Registration and payments are not enabled yet.</p>
        </>}
      </section>
    </main>
  );
}
