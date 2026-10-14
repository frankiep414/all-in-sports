'use client';

import { useEffect, useState, type FormEvent } from 'react';

type Kind = 'team' | 'individual';

export default function CarmitaRegistration() {
  const [kind, setKind] = useState<Kind>('individual');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [team, setTeam] = useState('');
  const [soccer, setSoccer] = useState(true);
  const [walk, setWalk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function syncSelection() {
      const selected = new URLSearchParams(window.location.hash.split('?')[1] || '').get('type');
      if (selected === 'team' || selected === 'individual') setKind(selected);
    }
    syncSelection();
    window.addEventListener('hashchange', syncSelection);
    return () => window.removeEventListener('hashchange', syncSelection);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/carmita/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationType: kind,
          contactName: name,
          contactEmail: email,
          contactPhone: phone,
          teamName: kind === 'team' ? team : undefined,
          activities: kind === 'individual' ? [soccer && 'soccer', walk && 'run_walk'].filter(Boolean) : ['soccer']
        })
      });
      const data = await r.json();
      if (!r.ok || typeof data.checkoutUrl !== 'string') throw new Error(data.error || 'Unable to start checkout.');
      window.location.assign(data.checkoutUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start checkout.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 650, margin: '24px auto', padding: 24, border: '1px solid #8755a4', borderRadius: 20, background: '#171320', color: 'white', textAlign: 'left' }}>
      <div role="group" aria-label="Registration type" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button type="button" aria-pressed={kind === 'individual'} onClick={() => setKind('individual')} style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid #bb93cf', background: kind === 'individual' ? '#e2b8ff' : '#292133', color: kind === 'individual' ? '#1c1125' : 'white', fontWeight: 700 }}>Individual · $25</button>
        <button type="button" aria-pressed={kind === 'team'} onClick={() => setKind('team')} style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid #bb93cf', background: kind === 'team' ? '#e2b8ff' : '#292133', color: kind === 'team' ? '#1c1125' : 'white', fontWeight: 700 }}>Full team · $250</button>
      </div>
      <p style={{ marginBottom: 16, opacity: 0.85 }}>{kind === 'team' ? 'One captain registers and pays for the entire team. No player roster required yet.' : 'One $25 registration covers soccer, the run/walk, or both.'}</p>
      {kind === 'team' && <label style={{ display: 'block', marginBottom: 14 }}>Team name *
        <input required maxLength={120} value={team} onChange={e => setTeam(e.target.value)} placeholder="Your team name" style={field} />
      </label>}
      <label style={{ display: 'block', marginBottom: 14 }}>{kind === 'team' ? 'Captain name' : 'Participant name'} *
        <input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} autoComplete="name" style={field} />
      </label>
      <label style={{ display: 'block', marginBottom: 14 }}>Email address *
        <input required type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={field} />
      </label>
      <label style={{ display: 'block', marginBottom: 14 }}>Phone number (optional)
        <input type="tel" maxLength={40} value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" style={field} />
      </label>
      {kind === 'individual' && <fieldset style={{ border: '1px solid #685674', borderRadius: 10, padding: 12, marginBottom: 18 }}>
        <legend>I'm participating in *</legend>
        <label style={{ display: 'block', marginBottom: 10 }}><input type="checkbox" checked={soccer} onChange={e => setSoccer(e.target.checked)} /> Soccer (ages 16+)</label>
        <label style={{ display: 'block' }}><input type="checkbox" checked={walk} onChange={e => setWalk(e.target.checked)} /> 2-mile fun run / 1-mile walk</label>
      </fieldset>}
      <button type="submit" disabled={busy || (kind === 'individual' && !soccer && !walk)} style={{ display: 'block', width: '100%', border: 0, borderRadius: 12, padding: '16px 20px', background: '#e2b8ff', color: '#1c1125', fontWeight: 800, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.65 : 1 }}>
        {busy ? 'Opening secure checkout…' : `CONTINUE TO SECURE PAYMENT · $${kind === 'team' ? '250' : '25'}`}
      </button>
      {error && <p role="alert" style={{ color: '#ffb7b7', marginTop: 12 }}>{error}</p>}
      <p style={{ marginTop: 12, fontSize: 13, opacity: 0.8 }}>No All In Sports account required. Registration is confirmed only after payment is verified.</p>
    </form>
  );
}

const field: React.CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 6,
  borderRadius: 8, border: '1px solid #8d759d', background: '#fff', color: '#15121a'
};
