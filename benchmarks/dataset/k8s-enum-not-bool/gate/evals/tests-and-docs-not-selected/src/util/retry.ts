// A status of 500 or more means the receiver failed, and the delivery may succeed later.
export function isRetryableStatus(status: number): boolean {
  return status >= 500;
}
