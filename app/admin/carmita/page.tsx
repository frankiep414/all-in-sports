'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Registration = { id: string; registration_type: string; contact_name: string; contact_email: string; contact_phone: string | null; team_name: string | null; activities: string[]; amount_cents: number; payment_status: string; created_at: string; paid_at: string | null; confirmation_email_status: string; confirmation_email_sent_at: string | null; confirmation_email_id: string | null };
type Report = { registrations: Registration[]; totalCount: number; truncated: boolean; paidCount: number; paidAmountCents: number };
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
function csvCell(value: unknown) { return '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""') + '"'; }

export default function CarmitaAdminPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [message, setMessage] = useState('Loading registrations…');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  function client() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error('Authentication unavailable.');
    return createClient(url, key);
  }
  async function sendCode() {
    setAuthBusy(true); setAuthNotice('');
    try {
      const { error } = await client().auth.signInWithOtp({
        email: email.trim(), options: { shouldCreateUser: false }
      });
      if (error) throw error;
      setCodeSent(true); setAuthNotice('Check your email for a verification code.');
    } catch (e) { setAuthNotice(e instanceof Error ? e.message : 'Unable to send code.'); }
    finally { setAuthBusy(false); }
  }
  async function verifyCode() {
    setAuthBusy(true); setAuthNotice('');
    try {
      const { error } = await client().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error) throw error;
      setSignedIn(true);
      await refresh();
    } catch (e) { setAuthNotice(e instanceof Error ? e.message : 'Unable to verify code.'); }
    finally { setAuthBusy(false); }
  }
  async function signOut() {
    await client().auth.signOut();
    setReport(null); setSignedIn(false); setCodeSent(false); setCode(''); setMessage('Please sign in with your admin account.');
  }
  async function refresh() {
    setBusy(true); setMessage('Loading registrations…');
    try {
      const auth = client();
      const { data: { session } } = await auth.auth.getSession();
      if (!session?.access_token) { setSignedIn(false); throw new Error('Please sign in with your admin account.'); }
      setSignedIn(true);
      const response = await fetch('/api/admin/carmita', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load registrations.');
      setReport(result); setMessage('');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to load registrations.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);
  function downloadCsv() {
    if (!report) return;
    const headings = ['ID','Type','Name','Email','Phone','Team','Activities','Amount USD','Payment Status','Email Status','Email Accepted At','Resend Email ID','Created At','Paid At'];
    const lines = report.registrations.map(r => [r.id,r.registration_type,r.contact_name,r.contact_email,r.contact_phone,r.team_name,r.activities.join(' / '),(r.amount_cents / 100).toFixed(2),r.payment_status,r.confirmation_email_status,r.confirmation_email_sent_at,r.confirmation_email_id,r.created_at,r.paid_at].map(csvCell).join(','));
    const csv = [headings.map(csvCell).join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = href; a.download = 'play-for-carmita-registrations.csv'; a.click();
    URL.revokeObjectURL(href);
  }
  const cellStyle = { padding: '14px 16px', borderBottom: '1px solid #273241', verticalAlign: 'top' as const, lineHeight: 1.5 };
  const emailCellStyle = { ...cellStyle, minWidth: 230, overflowWrap: 'anywhere' as const };
  const emailAttentionCount = report?.registrations.filter(r => r.payment_status === 'paid' && r.confirmation_email_status !== 'sent').length || 0;
  const paidTeams = report?.registrations.filter(r => r.registration_type === 'team' && r.payment_status === 'paid').length || 0;
  const paidIndividuals = report?.registrations.filter(r => r.registration_type === 'individual' && r.payment_status === 'paid').length || 0;
  return <main style={{ minHeight: '100vh', background: '#0c1018', color: '#fff', padding: '30px max(20px, 4vw)' }}>
    <Link href="/play-for-carmita" style={{ color: '#e2b8ff' }}>← Back to Carmita</Link>
    <h1>Play for Carmita · Registrations</h1>
    <p>Private admin view. Only Stripe-confirmed payments count as paid.</p>
    {!signedIn && <section style={{ maxWidth: 430, padding: 24, margin: '22px 0', border: '1px solid #394357', borderRadius: 14, background: '#141c29' }}>
      <h2 style={{ marginTop: 0 }}>Admin sign in</h2>
      <p>Use the email associated with your authorized All In Sports admin account.</p>
      <form onSubmit={e => { e.preventDefault(); void (codeSent ? verifyCode() : sendCode()); }} style={{ display: 'grid', gap: 12 }}>
        <label htmlFor="carmita-admin-email">Email address</label>
        <input id="carmita-admin-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={codeSent || authBusy} style={{ padding: 12, fontSize: 16, borderRadius: 8 }} />
        {codeSent && <><label htmlFor="carmita-admin-code">Email verification code</label><input id="carmita-admin-code" type="text" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e => setCode(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8 }} /></>}
        <button type="submit" disabled={authBusy} style={{ padding: 12, cursor: 'pointer' }}>{authBusy ? 'Please wait…' : codeSent ? 'Verify and open dashboard' : 'Send verification code'}</button>
        {codeSent && <button type="button" onClick={() => { setCodeSent(false); setCode(''); setAuthNotice(''); }} style={{ padding: 10 }}>Use a different email</button>}
        {authNotice && <p role="status">{authNotice}</p>}
      </form>
    </section>}
    {signedIn && <button type="button" onClick={() => void signOut()} style={{ padding: 12, marginRight: 12 }}>Sign out</button>}
    <button type="button" onClick={() => void refresh()} disabled={busy || !signedIn} style={{ padding: 12, marginRight: 12 }}>Refresh</button>
    <button type="button" onClick={downloadCsv} disabled={!report} style={{ padding: 12 }}>Export CSV</button>
    {message && <p role="status">{message}</p>}
    {report && <>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', margin: '24px 0' }}>
        <strong>Paid revenue: {money(report.paidAmountCents)}</strong>
        <strong>Paid teams: {paidTeams}</strong>
        <strong>Paid individuals: {paidIndividuals}</strong>
        <strong>All registration attempts: {report.totalCount}</strong>
        <strong>Paid registrations needing email review: {emailAttentionCount}</strong>
      </div>
      {report.truncated && <p role="alert" style={{ color: '#ffce86' }}>Showing only the latest 1,000 records. Totals and CSV are incomplete; use database reporting for full figures.</p>}
      <p style={{ opacity: .75, fontSize: 13 }}>On smaller screens, scroll the table horizontally to see every column.</p>
      <div style={{ overflowX: 'auto', maxWidth: '100%', border: '1px solid #273241', borderRadius: 12 }}>
        <table style={{ width: '100%', minWidth: 1280, borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'auto' }}>
          <thead><tr>{['Created','Type','Participant / Captain','Team','Activities','Email','Phone','Amount','Payment','Confirmation Email'].map(x => <th key={x} style={{ ...cellStyle, color: '#d8e4f2', whiteSpace: 'nowrap', borderBottom: '2px solid #607080' }}>{x}</th>)}</tr></thead>
          <tbody>{report.registrations.map(r => <tr key={r.id}>
            <td style={{ ...cellStyle, minWidth: 150 }}>{new Date(r.created_at).toLocaleString()}</td>
            <td style={cellStyle}>{r.registration_type}</td><td style={{ ...cellStyle, minWidth: 155 }}>{r.contact_name}</td><td style={{ ...cellStyle, minWidth: 130 }}>{r.team_name || '—'}</td>
            <td style={{ ...cellStyle, minWidth: 135 }}>{r.activities.join(', ')}</td><td style={emailCellStyle}>{r.contact_email}</td><td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{r.contact_phone || '—'}</td>
            <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{money(r.amount_cents)}</td><td style={cellStyle}>{r.payment_status}</td><td style={{ ...cellStyle, minWidth: 175 }}>{r.payment_status === 'paid' ? (r.confirmation_email_status === 'sent' ? 'Sent (accepted)' : r.confirmation_email_status === 'failed' ? 'Failed — needs attention' : 'Pending / not yet verified') : '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </main>;
}
