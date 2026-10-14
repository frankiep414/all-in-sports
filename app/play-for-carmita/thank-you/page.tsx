'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
type Status = { status: 'confirmed' | 'processing' | 'not_confirmed'; registrationType?: string; teamName?: string; activities?: string[]; amountCents?: number };
export default function CarmitaThankYou() {
  const [result, setResult] = useState<Status | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const session = new URLSearchParams(window.location.search).get('session_id');
    if (!session) { setError('No checkout session was provided.'); return; }
    let stopped = false;
    let attempt = 0;
    const check = async () => {
      try {
        const response = await fetch('/api/carmita/confirmation?session_id=' + encodeURIComponent(session), { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to verify payment.');
        if (stopped) return;
        setResult(data);
        if (data.status === 'processing' && ++attempt < 12) window.setTimeout(check, 2500);
      } catch (e) { if (!stopped) setError(e instanceof Error ? e.message : 'Unable to verify payment.'); }
    };
    void check();
    return () => { stopped = true; };
  }, []);
  const confirmed = result?.status === 'confirmed';
  return <main style={{ minHeight: '100vh', background: 'linear-gradient(150deg,#1c1029,#111923)', color: '#fff', display: 'grid', placeItems: 'center', padding: 24 }}>
    <article style={{ maxWidth: 650, width: '100%', border: '1px solid #8d5b9d', borderRadius: 22, padding: 'clamp(24px,5vw,50px)', textAlign: 'center', background: '#20182a' }}>
      <p style={{ fontSize: 40, margin: '0 0 12px' }}>❤️ ⚽</p>
      <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', margin: '0 0 16px' }}>{confirmed ? 'Thank you for playing for Carmita!' : 'Thank you for supporting Play for Carmita'}</h1>
      {confirmed ? <>
        <p style={{ fontSize: 20, color: '#d7f8d8', fontWeight: 700 }}>Your registration is confirmed.</p>
        <p>We can't wait to come together as a community in support of brain aneurysm awareness.</p>
        <div style={{ margin: '24px 0', padding: 20, background: '#33243d', borderRadius: 12, textAlign: 'left' }}>
          <p><strong>Registration:</strong> {result.registrationType === 'team' ? 'Full soccer team' : 'Individual'}</p>
          {result.teamName && <p><strong>Team:</strong> {result.teamName}</p>}
          <p><strong>Activities:</strong> {(result.activities || []).map(a => a === 'run_walk' ? 'Run / Walk' : 'Soccer').join(' + ')}</p>
          <p><strong>Amount paid:</strong> ${((result.amountCents || 0) / 100).toFixed(2)}{process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? '' : ' (Stripe test payment)'}</p>
        </div>
      </> : error ? <p role="alert">{error} Please check with the organizers before trying another payment.</p> :
        result?.status === 'not_confirmed' ? <p role="status">Your payment is not confirmed. Please contact the organizers before attempting another payment.</p> :
        <p role="status">We're checking your payment confirmation. This can take a moment. If it doesn't update, contact the organizers before trying again.</p>}
      <p><strong>October 31, 2026</strong> · 9 AM–1 PM</p>
      <p>Harrison High School · Harrison, New Jersey</p>
      <Link href="/play-for-carmita" style={{ display: 'inline-block', marginTop: 22, padding: '14px 22px', background: '#e2b8ff', color: '#201329', borderRadius: 12, fontWeight: 800, textDecoration: 'none' }}>Back to event details →</Link>
    </article>
  </main>;
}
