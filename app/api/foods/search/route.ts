import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
import { searchFoods } from '../../../../lib/food-search';

export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const q = params.get('q')?.trim() ?? '';
  // mode=local answers straight from saved foods, so results can appear while the full search is still running.
  const result = await searchFoods(supabase, q, { localOnly: params.get('mode') === 'local' });
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
