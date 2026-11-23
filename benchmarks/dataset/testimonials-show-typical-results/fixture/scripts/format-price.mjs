// Formats a price held in pence, as in data/plans.json, for the pricing page.

/** Returns a price in pence as pounds: 1900 gives "£19". */
export function formatPrice(pence) {
  return `£${pence / 100}`;
}
