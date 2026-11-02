/** Barcode helpers shared by the scanner (browser) and the lookup route (server). */

/** Digits only; null unless it looks like a retail barcode (UPC-E 8, UPC-A 12, EAN-13 13, GTIN-14). */
export function cleanBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 14 ? digits : null;
}

/**
 * The same product shows up as 12, 13 or 14 digits depending on the database (a UPC-A is an EAN-13 with a leading 0).
 * Every zero-padded form, so a lookup matches whichever one was saved.
 */
export function barcodeVariants(code: string): string[] {
  const digits = code.replace(/\D/g, '');
  const core = digits.replace(/^0+/, '') || digits;
  const out = new Set<string>([digits, core]);
  for (const length of [8, 12, 13, 14]) if (core.length <= length) out.add(core.padStart(length, '0'));
  return [...out];
}

export const sameBarcode = (a: string, b: string) => a.replace(/^0+/, '') === b.replace(/^0+/, '');
