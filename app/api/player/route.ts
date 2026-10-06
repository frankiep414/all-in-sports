import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
const id = searchParams.get('id');
const email = searchParams.get('email');

if (!id && !email) {
  return Response.json(
    { error: 'Player ID or email is required.' },
    { status: 400 }
  );
}
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return Response.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);

   let query = supabase
  .from('players')
  .select('id, full_name, email');

if (id) {
  query = query.eq('id', id);
} else if (email) {
  query = query.ilike('email', email.trim());
}

const { data: player, error } = await query.single();

    if (error || !player) {
      console.error('Player lookup error:', error);

      return Response.json(
        { error: 'Player not found.' },
        { status: 404 }
      );
    }

    return Response.json(player);
  } catch (error) {
    console.error('Player API error:', error);

    return Response.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
