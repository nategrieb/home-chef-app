import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
import { loadPortionOptions } from '../../../../lib/food-portions';

/** The units a food can be logged in, and which one to start on. */
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const options = await loadPortionOptions(supabase, id);
  if (!options) return NextResponse.json({ error: 'Food not found' }, { status: 404 });
  return NextResponse.json(options);
}
