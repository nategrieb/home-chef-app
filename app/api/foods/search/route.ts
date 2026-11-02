import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
import { searchFoods } from '../../../../lib/food-search';

export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  const result = await searchFoods(supabase, q);
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
