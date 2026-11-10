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
  const rnd = String(Math.floor(1 + Math.random() * 999)).padStart(3, "0");
  if (!name || !name.trim()) return `${prefix}-PRD-${rnd}`;

  const normalized = name
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9\s]/g, "");

  const allWords = normalized.split(/\s+/).filter(Boolean);
  if (allWords.length === 0) return `${prefix}-PRD-${rnd}`;

  const nonBrand = allWords.filter(
    (w) => !/^(enviro|enviroshield)$/i.test(w)
  );
  const words = nonBrand.length > 0 ? nonBrand : allWords;

  let code = "";
  if (words.length === 1) {
    const single = words[0].toUpperCase();
    code = single.length <= 3 ? single : single.slice(0, 3);
  } else {
    code = words
      .map((w) => w[0].toUpperCase())
      .slice(0, 4)
      .join("");
  }

  return `${prefix}-${code}-${rnd}`.toUpperCase();
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
