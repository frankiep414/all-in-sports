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
  async function refresh() {
    setBusy(true); setMessage('Loading registrations…');
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) throw new Error('Authentication unavailable.');
      const auth = createClient(url, key);
      const { data: { session } } = await auth.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in with your admin account.');
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
  const emailAttentionCount = report?.registrations.filter(r => r.payment_status === 'paid' && r.confirmation_email_status !== 'sent').length || 0;
  const paidTeams = report?.registrations.filter(r => r.registration_type === 'team' && r.payment_status === 'paid').length || 0;
  const paidIndividuals = report?.registrations.filter(r => r.registration_type === 'individual' && r.payment_status === 'paid').length || 0;
  return <main style={{ minHeight: '100vh', background: '#0c1018', color: '#fff', padding: '30px max(20px, 4vw)' }}>
    <Link href="/admin" style={{ color: '#e2b8ff' }}>← Back to Admin</Link>
    <h1>Play for Carmita · Registrations</h1>
    <p>Private admin view. Only Stripe-confirmed payments count as paid.</p>
    <button type="button" onClick={() => void refresh()} disabled={busy} style={{ padding: 12, marginRight: 12 }}>Refresh</button>
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
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead><tr>{['Created','Type','Participant / Captain','Team','Activities','Email','Phone','Amount','Payment','Confirmation Email'].map(x => <th key={x} style={{ padding: 10, borderBottom: '1px solid #888' }}>{x}</th>)}</tr></thead>
          <tbody>{report.registrations.map(r => <tr key={r.id}>
            <td style={{ padding: 10 }}>{new Date(r.created_at).toLocaleString()}</td>
            <td>{r.registration_type}</td><td>{r.contact_name}</td><td>{r.team_name || '—'}</td>
            <td>{r.activities.join(', ')}</td><td>{r.contact_email}</td><td>{r.contact_phone || '—'}</td>
            <td>{money(r.amount_cents)}</td><td>{r.payment_status}</td><td>{r.payment_status === 'paid' ? (r.confirmation_email_status === 'sent' ? 'Sent (accepted)' : r.confirmation_email_status === 'failed' ? 'Failed — needs attention' : 'Pending / not yet verified') : '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </main>;
}
