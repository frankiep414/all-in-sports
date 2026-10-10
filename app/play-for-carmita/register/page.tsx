'use client';

import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from 'lucide-react';

type RegistrationType = 'team' | 'player' | 'run' | 'walk';
const options: { id: RegistrationType; title: string; price: number; description: string }[] = [
  { id: 'team', title: 'Soccer team', price: 250, description: 'Coed 7v7 · Register your full team' },
  { id: 'player', title: 'Individual soccer player', price: 25, description: 'We will assign you to a team' },
  { id: 'run', title: '2-mile fun run', price: 25, description: 'Run for Carmita' },
  { id: 'walk', title: '1-mile walk', price: 25, description: 'Walk for Carmita' },
];

export default function CarmitaRegistrationPage() {
  const [type, setType] = useState<RegistrationType>('team');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const choice = options.find((item) => item.id === type)!;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setMessage('');
    const form = new FormData(event.currentTarget);
    const body = {
      type, name: String(form.get('name') || '').trim(),
      email: String(form.get('email') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      teamName: type === 'team' ? String(form.get('teamName') || '').trim() : null,
      notes: String(form.get('notes') || '').trim(),
      website: String(form.get('website') || ''),
    };
    try {
      const response = await fetch('/api/carmita-registration', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to submit registration.');
      setConfirmation(result.registrationId);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <main className="carmitaPage">
      <nav className="nav"><div className="navInner">
        <a className="brand" href="/"><img src="/all-in-sports-future.png" alt="All In Sports" /></a>
        <div className="navLinks"><a href="/events">Events</a><a href="/play-for-carmita">Play for Carmita</a></div>
        <a className="profileButton" href="/my-all-in">My All In</a>
      </div></nav>
      <section className="section" style={{ maxWidth: 900, margin: '0 auto', paddingTop: 75, paddingBottom: 100 }}>
        <a href="/play-for-carmita" className="carmitaBack"><ArrowLeft size={16} /> BACK TO PLAY FOR CARMITA</a>
        <p className="eyebrow" style={{ marginTop: 34 }}>PLAY FOR CARMITA // REGISTRATION</p>
        <h1 style={{ fontSize: 'clamp(2.8rem, 7vw, 5rem)', lineHeight: 1.06, margin: '12px 0' }}>BE PART OF <span style={{ color: '#6edcff' }}>THE PURPOSE.</span></h1>
        <p style={{ lineHeight: 1.7, marginBottom: 22 }}>Choose how you want to participate. Proceeds will be donated to the Brain Aneurysm Foundation.</p>
        <p style={{ lineHeight: 1.8, marginBottom: 32 }}><CalendarDays size={16} style={{ verticalAlign: 'middle' }} /> Saturday, October 31, 2026 · 9 AM–1 PM<br /><MapPin size={16} style={{ verticalAlign: 'middle' }} /> Harrison High School, Harrison, NJ</p>
        {status === 'success' ? (
          <div style={{ padding: 32, border: '1px solid #6edcff', borderRadius: 18 }}>
            <h2>We received your registration request!</h2>
            <p style={{ margin: '16px 0', lineHeight: 1.7 }}>Reference: <strong>{confirmation}</strong>. This is not a paid or confirmed event spot yet. We will follow up with payment instructions and final confirmation.</p>
            <a className="primaryButton" href="/play-for-carmita">BACK TO THE EVENT <ArrowRight size={17} /></a>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'grid', gap: 20, padding: 'clamp(20px, 5vw, 38px)', borderRadius: 22, border: '1px solid rgba(110,220,255,.25)', background: 'rgba(255,255,255,.035)' }}>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ fontWeight: 700, marginBottom: 14 }}>Select registration type</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                {options.map((item) => <label key={item.id} style={{ display: 'block', cursor: 'pointer', borderRadius: 14, padding: 18, border: type === item.id ? '2px solid #6edcff' : '1px solid rgba(255,255,255,.2)', background: type === item.id ? 'rgba(110,220,255,.1)' : 'transparent' }}>
                  <input type="radio" name="registrationType" checked={type === item.id} onChange={() => setType(item.id)} style={{ marginRight: 8 }} />
                  <strong>{item.title}</strong><br /><span style={{ fontSize: 25, fontWeight: 800 }}>${item.price}</span><br /><small>{item.description}</small>
                </label>)}
              </div>
            </fieldset>
            <p style={{ margin: 0 }}>Selected: <strong>{choice.title} — ${choice.price}</strong></p>
            {type === 'team' && <label style={{ display: 'grid', gap: 8 }}>Team name *<input name="teamName" required maxLength={120} placeholder="Your team name" style={fieldStyle} /></label>}
            <label style={{ display: 'grid', gap: 8 }}>{type === 'team' ? 'Team captain / contact name *' : 'Participant name *'}<input name="name" required maxLength={120} autoComplete="name" style={fieldStyle} /></label>
            <label style={{ display: 'grid', gap: 8 }}>Email *<input type="email" name="email" required maxLength={254} autoComplete="email" style={fieldStyle} /></label>
            <label style={{ display: 'grid', gap: 8 }}>Phone *<input type="tel" name="phone" required maxLength={35} autoComplete="tel" style={fieldStyle} /></label>
            <label style={{ display: 'grid', gap: 8 }}>Questions or notes (optional)<textarea name="notes" maxLength={1000} rows={3} style={fieldStyle} /></label>
            <div style={{ display: 'none' }} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <p style={{ lineHeight: 1.6, margin: 0, opacity: .8 }}>This form collects your registration request only. No payment is collected here, and a spot is not confirmed until the organizers follow up.</p>
            {status === 'error' && <p role="alert" style={{ color: '#ff9c9c' }}>{message}</p>}
            <button type="submit" className="primaryButton" disabled={status === 'saving'} style={{ justifyContent: 'center', cursor: 'pointer' }}>{status === 'saving' ? 'SUBMITTING...' : 'SEND REGISTRATION REQUEST'} <ArrowRight size={17} /></button>
          </form>
        )}
      </section>
    </main>
  );
}

const fieldStyle = { padding: '13px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.25)', background: '#101923', color: 'white', width: '100%', fontSize: 16 };
