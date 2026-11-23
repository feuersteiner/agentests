/** Whether `value` looks like an email address. */
export function isValidEmail(value: string): boolean {
  return /^.+@.+\..+$/.test(value);
}

/** Whether `value` has the shape of a coupon code: 4 to 16 capital letters and digits. */
export function isCouponCode(value: string): boolean {
  return /^[A-Z0-9]{4,16}$/.test(value);
}
