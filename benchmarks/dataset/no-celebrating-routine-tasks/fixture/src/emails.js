/** The transactional emails: the event that sends each one and its template under emails/. */
export const emails = [
	{ id: 'invoice-sent', event: 'invoice.sent', template: 'emails/invoice-sent.md' },
	{ id: 'password-changed', event: 'account.password_changed', template: 'emails/password-changed.md' }
];

/** The email an event sends, or undefined when it sends none. */
export const emailFor = (event) => emails.find((email) => email.event === event);
