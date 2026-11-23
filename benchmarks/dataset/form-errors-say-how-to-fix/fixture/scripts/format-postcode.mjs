/**
 * A UK postcode as the app shows it: capital letters, and one space before the last three
 * characters. formatPostcode('sw1a1aa') gives 'SW1A 1AA'.
 */
export function formatPostcode(input) {
  const compact = input.replace(/\s+/g, '').toUpperCase();
  return `${compact.slice(0, 4)} ${compact.slice(4)}`;
}
