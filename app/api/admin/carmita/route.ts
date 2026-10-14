import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return Response.json({ error: 'Sign in required.' }, { status: 401 });
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publicKey || !secret) return Response.json({ error: 'Not configured.' }, { status: 503 });
  const auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await auth.auth.getUser(token);
  if (authError || !user?.email_confirmed_at) return Response.json({ error: 'Sign in required.' }, { status: 401 });
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: admin, error: adminError } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (adminError || !admin) return Response.json({ error: 'Admin only.' }, { status: 403 });
  const { data, error, count } = await db.from('carmita_registrations')
    .select('id,registration_type,contact_name,contact_email,contact_phone,team_name,activities,amount_cents,payment_status,created_at,paid_at', { count: 'exact' })
    .order('created_at', { ascending: false }).limit(1000);
  if (error) return Response.json({ error: 'Unable to load registrations.' }, { status: 503 });
  const rows = data || [];
  return Response.json({
    registrations: rows,
    totalCount: count || 0,
    truncated: (count || 0) > rows.length,
    paidCount: rows.filter(row => row.payment_status === 'paid').length,
    paidAmountCents: rows.filter(row => row.payment_status === 'paid').reduce((sum, row) => sum + row.amount_cents, 0)
  }, { headers: { 'Cache-Control': 'no-store' } });
}
