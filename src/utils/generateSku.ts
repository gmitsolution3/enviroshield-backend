/**
 * Utility functions for automatic Product & Variant/Stock SKU generation in backend.
 */

export function cleanWeightForSku(weightOrSize: string): string {
  if (!weightOrSize || !weightOrSize.trim()) return "";
  const raw = weightOrSize.trim().toUpperCase();
  const withoutDecimals = raw.replace(/(\d+)\.(\d+)/g, "$1$2");
  return withoutDecimals.replace(/[^A-Z0-9]/g, "");
}

export function generateProductSku(name: string, prefix = "ENV"): string {
  if (!name || !name.trim()) return `${prefix}-PROD`;

  const normalized = name
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9\s]/g, "");

  const allWords = normalized.split(/\s+/).filter(Boolean);
  if (allWords.length === 0) return `${prefix}-PROD`;

  const nonBrand = allWords.filter(
    (w) => !/^(enviro|enviroshield)$/i.test(w)
  );
  const words = nonBrand.length > 0 ? nonBrand : allWords;

  const cleanWord = (w: string) => {
    const upper = w.toUpperCase();
    return upper.length <= 6 ? upper : upper.slice(0, 5);
  };

  let code = "";
  if (words.length === 1) {
    code = cleanWord(words[0]);
  } else {
    const w1 = cleanWord(words[0]);
    const w2 = cleanWord(words[1]);
    code = `${w1}-${w2}`;
  }

  return `${prefix}-${code}`.toUpperCase();
}

export function generateVariantSku(
  productSku: string,
  weightOrSize: string,
  index = 1
): string {
  const base = (productSku || "ENV").trim().toUpperCase();
  const weightCode = cleanWeightForSku(weightOrSize);

  if (weightCode) {
    return `${base}-${weightCode}`;
  }
  return `${base}-V${index}`;
}
