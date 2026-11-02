import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/supabase-server';
import { FOOD_COLUMNS, type Food } from '../../../../lib/nutrition';
import { barcodeToStore, barcodeVariants, cleanBarcode, isValidGtin, priceCodeKey, sameBarcode } from '../../../../lib/barcode';
import { fetchOffProduct, offToFoodRow, type OffProduct } from '../../../../lib/off';
import { toFoodRow, usdaSearch } from '../../../../lib/usda';

type Draft = { name: string; brand: string | null; barcode: string; serving_g: number | null; serving_label: string | null };

// What a scan means, so the screen can show the number it read and what it will be saved as.
const scanInfo = (code: string) => ({ scanned: code, storeKey: barcodeToStore(code), priceCoded: priceCodeKey(code) !== null });

/**
 * Barcode -> food. Looks in what is already saved (including your own foods), then Open Food Facts, then USDA's
 * branded foods. Anything found is saved, so the next scan is instant. If nothing usable turns up, the response
 * carries whatever name and brand it learned so the person can complete the food from the label.
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const code = cleanBarcode(new URL(request.url).searchParams.get('code') ?? '');
  if (!code) return NextResponse.json({ status: 'invalid', error: 'That doesn’t look like a barcode.' }, { status: 400 });
  if (!isValidGtin(code)) return NextResponse.json({ status: 'invalid', error: 'That number doesn’t pass the barcode check.' }, { status: 400 });

  const chef = supabase.schema('chef');
  const variants = barcodeVariants(code);
  const info = scanInfo(code);

  // 0) Barcodes you attached to a food yourself. (If that table isn't set up yet this is just empty.)
  const { data: linked } = await chef.from('food_barcodes').select(`food:foods (${FOOD_COLUMNS})`).in('barcode', variants).limit(1);
  const linkedFood = ((linked ?? []) as unknown as { food: Food | null }[])[0]?.food;
  if (linkedFood) return NextResponse.json({ status: 'found', food: linkedFood, from: 'linked', ...info });

  // 1) Already saved: yours first, then the shared catalogue.
  const { data: saved } = await chef.from('foods').select(FOOD_COLUMNS).in('barcode', variants).limit(5);
  const savedFoods = (saved ?? []) as Food[];
  if (savedFoods.length > 0) {
    const food = savedFoods.find((f) => f.source === 'custom') ?? savedFoods[0];
    return NextResponse.json({ status: 'found', food, from: 'saved', ...info });
  }

  async function saveAndLoad(row: { source: 'usda' | 'off'; source_id: string } | null): Promise<Food | null> {
    if (!row) return null;
    let { error } = await chef.from('foods').upsert(row, { onConflict: 'source,source_id', ignoreDuplicates: true });
    if (error) ({ error } = await chef.from('foods').upsert(row, { onConflict: 'source,source_id', ignoreDuplicates: true }));
    if (error) {
      console.error('saving scanned food failed:', error);
      return null;
    }
    const { data } = await chef.from('foods').select(FOOD_COLUMNS).eq('source', row.source).eq('source_id', row.source_id).maybeSingle();
    return (data as Food | null) ?? null;
  }

  let draft: Draft | null = null;
  let offDown = false;

  // 2) Open Food Facts.
  const off = await fetchOffProduct(code);
  if (off === 'unavailable') offDown = true;
  else if (off !== 'not_found') {
    const food = await saveAndLoad(offToFoodRow(off as OffProduct));
    if (food) return NextResponse.json({ status: 'found', food, from: 'openfoodfacts', ...info });
    const p = off as OffProduct;
    if (p.name) draft = { name: p.name, brand: p.brand, barcode: code, serving_g: p.serving_g, serving_label: p.serving_label };
  }

  // 3) USDA branded foods (US packaged goods). Their GTINs are often zero-padded, so try the padded form first.
  const apiKey = process.env.USDA_API_KEY ?? 'DEMO_KEY';
  for (const query of [code.padStart(14, '0'), code]) {
    const results = await usdaSearch(query, 'Branded', 5, apiKey);
    if (!Array.isArray(results)) continue;
    const match = results.find((r) => r.gtinUpc && sameBarcode(r.gtinUpc, code));
    if (!match) continue;
    const row = toFoodRow(match);
    const food = await saveAndLoad(row);
    if (food) return NextResponse.json({ status: 'found', food, from: 'usda', ...info });
    break;
  }

  return NextResponse.json({
    status: draft ? 'incomplete' : 'not_found',
    draft: draft ?? { name: '', brand: null, barcode: code, serving_g: null, serving_label: null },
    offDown,
    ...info,
  });
}
