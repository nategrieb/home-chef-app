/** Barcode helpers shared by the scanner (browser) and the lookup route (server). */

const digitsOf = (raw: string) => raw.replace(/\D/g, '');

/** Digits only; null unless it looks like a retail barcode (UPC-E 8, UPC-A 12, EAN-13 13, GTIN-14). */
export function cleanBarcode(raw: string): string | null {
  const digits = digitsOf(raw);
  return digits.length >= 8 && digits.length <= 14 ? digits : null;
}

/** True when the last digit is the right check digit for the rest (every real barcode passes; most typos and misreads don't). */
export function isValidGtin(raw: string): boolean {
  const digits = digitsOf(raw);
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  const body = digits.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    // Weights run 3, 1, 3, 1… counting from the digit next to the check digit.
    const fromRight = body.length - i;
    sum += Number(body[i]) * (fromRight % 2 === 1 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
}

/** An 8-digit UPC-E (the squeezed form on small packages) written out as the full 12-digit UPC-A, or null. */
export function expandUpcE(raw: string): string | null {
  const d = digitsOf(raw);
  if (d.length !== 8 || (d[0] !== '0' && d[0] !== '1')) return null;
  const [n, x1, x2, x3, x4, x5, x6, c] = d.split('');
  let body: string;
  if ('012'.includes(x6)) body = `${n}${x1}${x2}${x6}0000${x3}${x4}${x5}`;
  else if (x6 === '3') body = `${n}${x1}${x2}${x3}00000${x4}${x5}`;
  else if (x6 === '4') body = `${n}${x1}${x2}${x3}${x4}00000${x5}`;
  else body = `${n}${x1}${x2}${x3}${x4}${x5}0000${x6}`;
  return body + c;
}

/**
 * Store labels (deli, bakery, butcher, produce) often print a barcode that starts with 2 and has the price or weight
 * inside it, so the number changes from label to label while the item stays the same. This returns a key made from
 * just the item part ("pe:250049"), or null for an ordinary product barcode.
 */
export function priceCodeKey(raw: string): string | null {
  const d = digitsOf(raw);
  if (d.length === 12 && d[0] === '2') return `pe:${d.slice(0, 6)}`; // UPC-A: 2 + item (5) + price (5) + check
  if (d.length === 13 && d.startsWith('02')) return `pe:${d.slice(1, 7)}`; // the same label read as EAN-13
  if (d.length === 13 && d[0] === '2') return `pe:${d.slice(0, 7)}`; // EAN-13 variable-measure
  return null;
}

/** What to save as a food's barcode: the item key for price-coded labels, the digits otherwise. */
export function barcodeToStore(raw: string): string {
  return priceCodeKey(raw) ?? digitsOf(raw);
}

/**
 * Every form a barcode can be saved under: as scanned, with or without leading zeros (a UPC-A is an EAN-13 with a
 * leading 0), the expanded form of a UPC-E, and the item key of a price-coded label. A lookup matches any of them.
 */
export function barcodeVariants(raw: string): string[] {
  const digits = digitsOf(raw);
  const out = new Set<string>();

  const key = priceCodeKey(digits);
  if (key) out.add(key);

  for (const form of [digits, expandUpcE(digits)]) {
    if (!form) continue;
    const core = form.replace(/^0+/, '') || form;
    out.add(form);
    out.add(core);
    for (const length of [8, 12, 13, 14]) if (core.length <= length) out.add(core.padStart(length, '0'));
  }
  return [...out];
}

export function sameBarcode(a: string, b: string): boolean {
  const left = new Set(barcodeVariants(a));
  return barcodeVariants(b).some((variant) => left.has(variant));
}
