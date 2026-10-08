import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publicKey || !secretKey) return Response.json({ error: 'Server not configured' }, { status: 500 });
  const auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await auth.auth.getUser(token);
  if (error || !user || !user.email_confirmed_at) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error: lookupError } = await admin.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (lookupError) return Response.json({ error: 'Unable to verify access' }, { status: 500 });
  if (!data) return Response.json({ error: 'Administrator access required' }, { status: 403 });
  return Response.json({ authorized: true });
}
