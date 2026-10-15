import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url || !publicKey || !secretKey) {
      console.error('[admin/me] Missing Supabase configuration', {
        urlPresent: Boolean(url),
        publishableKeyPresent: Boolean(publicKey),
        secretKeyPresent: Boolean(secretKey),
      });
      return Response.json({ error: 'Server configuration unavailable' }, { status: 500 });
    }

    const auth = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError) {
      console.error('[admin/me] Supabase authentication failed', {
        code: authError.code,
        status: authError.status,
        name: authError.name,
      });
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user || !user.email_confirmed_at) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const admin = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: lookupError } = await admin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (lookupError) {
      // Never log tokens, secret keys, emails or user IDs.
      console.error('[admin/me] Admin lookup failed', {
        code: lookupError.code,
        message: lookupError.message,
        hint: lookupError.hint,
      });
      return Response.json({ error: 'Administrator lookup unavailable' }, { status: 500 });
    }

    if (!data) return Response.json({ error: 'Administrator access required' }, { status: 403 });
    return Response.json({ authorized: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/me] Unexpected server error', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Unexpected error',
    });
    return Response.json({ error: 'Unable to verify administrator access' }, { status: 500 });
  }
}
