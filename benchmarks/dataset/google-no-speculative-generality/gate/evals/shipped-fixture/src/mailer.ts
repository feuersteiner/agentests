export type Mail = {
	to: string;
	subject: string;
	text: string;
};

/** Mails kept in memory when no mail service is configured, as on a laptop and in the tests. */
export const outbox: Mail[] = [];

/** Sends one plain-text mail through the mail service at MAIL_API_URL. */
export async function sendMail(mail: Mail): Promise<void> {
	const url = process.env.MAIL_API_URL;
	if (!url) {
		outbox.push(mail);
		return;
	}
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${process.env.MAIL_API_TOKEN}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({ from: 'orders@fernhill.example', ...mail })
	});
	if (!response.ok) throw new Error(`Mail service answered ${response.status}`);
}
