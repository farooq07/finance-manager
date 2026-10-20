import prisma from '../utils/prisma.js';

// Pakistani gold conventions used across the Gold Vault and the AI assistant.
export const NISAB_GRAMS    = 85;     // 24K-equivalent grams that trigger Zakat
export const ZAKAT_RATE     = 0.025;  // 2.5%
export const GRAMS_PER_TOLA = 11.664; // 1 tola = 11.664 grams (Pakistani standard)

// Current PKR value of one gold item at a given 24K price-per-gram, adjusted for purity.
export function valueForItem(item, pricePerGram24k) {
  if (!pricePerGram24k) return 0;
  const grams = Number(item.weight_grams);
  const purityFactor = Number(item.carats) / 24;
  return Number((grams * Number(pricePerGram24k) * purityFactor).toFixed(2));
}

// Original purchase value of an item, if a purchase price was recorded.
export function purchaseValueForItem(item) {
  if (!item.purchase_price_per_gram) return null;
  const grams = Number(item.weight_grams);
  const purityFactor = Number(item.carats) / 24;
  return Number((grams * Number(item.purchase_price_per_gram) * purityFactor).toFixed(2));
}

// Weight expressed as pure 24K-equivalent grams (used for nisab checks).
export function equivalent24kGrams(item) {
  return Number(item.weight_grams) * (Number(item.carats) / 24);
}

// Totals across a user's gold items at a given 24K price-per-gram.
export function summarizeGold(items, pricePerGram24k) {
  let total24kGrams = 0;
  let totalValue    = 0;
  for (const item of items) {
    total24kGrams += equivalent24kGrams(item);
    totalValue    += valueForItem(item, pricePerGram24k);
  }
  return { total24kGrams, totalValue };
}

// Newest scraped gold price row, or null if none has been recorded yet.
export function getLatestPriceRow() {
  return prisma.goldPriceHistory.findFirst({ orderBy: { date: 'desc' } });
}
