export interface Email {
  to: string;
  subject: string;
  text: string;
}

// Outgoing email waits here until the mail worker picks it up.
export const outbox: Email[] = [];

export function sendEmail(email: Email): void {
  outbox.push(email);
}

export function clearOutbox(): void {
  outbox.length = 0;
}
