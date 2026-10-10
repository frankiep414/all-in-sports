'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type Kind = 'team' | 'individual' | 'run_walk';
const options: { value: Kind; label: string; price: string }[] = [
  { value: 'team', label: 'Coed 7v7 soccer team', price: '$250' },
  { value: 'individual', label: 'Individual soccer player (16+)', price: '$25' },
  { value: 'run_walk', label: '2-mile run / 1-mile walk (all ages)', price: '$25' },
];

function RegistrationForm() {
  const params = useSearchParams();
  const requested = params.get('type');
  const [kind, setKind] = useState<Kind>(requested === 'team' || requested === 'individual' || requested === 'run_walk' ? requested : 'team');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [teamName, setTeamName] = useState('');
  const [activity, setActivity] = useState('run');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/carmita/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, fullName, email, phone, teamName, activity }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'Checkout unavailable');
      window.location.assign(result.url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); setBusy(false); }
  }
  return <main className="carmitaPage" style={{ minHeight: '100vh', padding: '64px 20px' }}>
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <Link href="/play-for-carmita" className="carmitaBack">← BACK TO PLAY FOR CARMITA</Link>
      <p className="eyebrow" style={{ marginTop: 40 }}>OCTOBER 31, 2026 · HARRISON HIGH SCHOOL</p>
      <h1 style={{ fontSize: 'clamp(32px, 6vw, 58px)', lineHeight: 1.05 }}>EVENT REGISTRATION</h1>
      <p style={{ margin: '20px 0 30px', opacity: .85 }}>Complete your information and continue to secure Stripe Checkout. Registration is confirmed only after successful payment.</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 18 }}>
        <label>Registration type
          <select value={kind} onChange={e => setKind(e.target.value as Kind)} style={fieldStyle}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label} — {o.price}</option>)}
          </select>
        </label>
        <label>Full name<input required minLength={2} maxLength={120} autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} style={fieldStyle} /></label>
        <label>Email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={fieldStyle} /></label>
        <label>Phone<input required type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} style={fieldStyle} /></label>
        {kind === 'team' && <label>Team name<input required maxLength={100} value={teamName} onChange={e => setTeamName(e.target.value)} style={fieldStyle} /></label>}
        {kind === 'run_walk' && <label>Choose activity<select value={activity} onChange={e => setActivity(e.target.value)} style={fieldStyle}><option value="run">2-mile fun run</option><option value="walk">1-mile walk</option></select></label>}
        {kind !== 'run_walk' && <p style={{ opacity: .75, fontSize: 14 }}>Soccer is for ages 16+. Individual players will be assigned to teams.</p>}
        {params.get('cancelled') && <p>Payment was cancelled. You can try again.</p>}
        {error && <p role="alert" style={{ color: '#ff8b9a' }}>{error}</p>}
        <button className="primaryButton" type="submit" disabled={busy} style={{ cursor: busy ? 'wait' : 'pointer', justifyContent: 'center' }}>{busy ? 'PLEASE WAIT…' : 'CONTINUE TO SECURE PAYMENT →'}</button>
      </form>
      <p style={{ marginTop: 26, opacity: .7, fontSize: 13 }}>Proceeds will be donated to the Brain Aneurysm Foundation.</p>
    </div>
  </main>;
}
const fieldStyle: React.CSSProperties = { display: 'block', width: '100%', marginTop: 8, padding: '13px 14px', borderRadius: 8, border: '1px solid #8791a4', color: '#17233b', background: '#fff', fontSize: 16 };
export default function RegistrationPage() { return <Suspense fallback={<main>Loading registration…</main>}><RegistrationForm /></Suspense>; }
