'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Status = 'loading' | 'authorized' | 'denied' | 'error';

export default function AdminPage() {
  const [status, setStatus] = useState<Status>('loading');
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
          <p style={{color:'#b8c1d0',marginTop:32}}>Administrator access is verified. Game creation, registration management, and payment actions are not enabled yet.</p>
        </>}
      </section>
    </main>
  );
}
