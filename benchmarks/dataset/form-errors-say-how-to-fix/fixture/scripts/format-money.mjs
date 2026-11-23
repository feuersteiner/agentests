/** An amount in pence as the app shows it in pounds: formatPounds(45000) gives '£450.00'. */
export function formatPounds(pence) {
  return `£${(pence / 100).toFixed(2)}`;
}
