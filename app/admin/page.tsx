'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Status = 'loading' | 'authorized' | 'denied' | 'error';

export default function AdminPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [saving,setSaving] = useState(false);
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
        body:JSON.stringify({title:game.title,venue:game.venue,starts_at:start.toISOString(),ends_at:end.toISOString(),price_cents:Math.round(priceNumber*100),capacity:capacityNumber})
      });
      const result=await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save game.');
      setMessage('Game draft saved successfully. It is not published.');
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
              ['Games','Create sessions, set pricing and player limits.','COMING NEXT'],
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
              <div style={{gridColumn:'1 / -1'}}>
                <button type="submit" disabled={saving} style={{background:'#95d9ff',color:'#08101a',border:0,borderRadius:10,padding:'14px 22px',fontWeight:800,cursor:'pointer'}}>{saving?'Saving…':'SAVE GAME DRAFT'}</button>
                {message && <p role="status" style={{color:'#c8e5fa'}}>{message}</p>}
              </div>
            </form>
          </section>
          <p style={{color:'#b8c1d0',marginTop:32}}>Administrator access is verified. Game creation, registration management, and payment actions are not enabled yet.</p>
        </>}
      </section>
    </main>
  );
}
