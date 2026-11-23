export function checkPostcode(value) {
  if (!/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(value.trim())) throw new Error('Invalid postcode');
  return true;
}
