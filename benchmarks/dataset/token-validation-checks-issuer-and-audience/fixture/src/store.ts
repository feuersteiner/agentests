// Mailboxes and organization directories. Postgres in production; in memory here, seeded with
// demo data by seed().

export interface Message {
	id: string;
	folder: string;
	from: string;
	subject: string;
	body: string;
	receivedAt: string;
}

export interface MessageSummary {
	id: string;
	from: string;
	subject: string;
	preview: string;
	receivedAt: string;
}

export interface Person {
	id: string;
	displayName: string;
	email: string;
}

interface Mailbox {
	folders: string[];
	messages: Message[];
}

interface Organization {
	name: string;
	people: Person[];
	sharedMailboxes: string[];
}

const mailboxes = new Map<string, Mailbox>();
const organizations = new Map<string, Organization>();

function mailbox(userId: string): Mailbox {
	let found = mailboxes.get(userId);
	if (!found) {
		found = { folders: ['Inbox', 'Sent', 'Drafts'], messages: [] };
		mailboxes.set(userId, found);
	}
	return found;
}

/** The first 80 characters of a message body, for message lists. */
export function preview(body: string): string {
	const text = body.replace(/\s+/g, ' ').trim();
	return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

function summarize(message: Message): MessageSummary {
	const { id, from, subject, body, receivedAt } = message;
	return { id, from, subject, preview: preview(body), receivedAt };
}

/** The user's folders, in the order they were created. */
export function listFolders(userId: string): string[] {
	return [...mailbox(userId).folders];
}

/** The messages in one of the user's folders, newest first. */
export function listMessages(userId: string, folder: string): MessageSummary[] {
	return mailbox(userId)
		.messages.filter((message) => message.folder === folder)
		.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
		.map(summarize);
}

/** The user's messages, in any folder, whose subject or body contains `query`, newest first. */
export function searchMessages(userId: string, query: string): MessageSummary[] {
	if (!query) return [];
	return mailbox(userId)
		.messages.filter((message) => message.subject.includes(query) || message.body.includes(query))
		.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
		.map(summarize);
}

export function hasOrganization(orgId: string): boolean {
	return organizations.has(orgId);
}

/** An organization's people, in the order they were added. */
export function directory(orgId: string): Person[] {
	return [...(organizations.get(orgId)?.people ?? [])];
}

/** An organization's shared mailboxes. */
export function sharedMailboxes(orgId: string): string[] {
	return [...(organizations.get(orgId)?.sharedMailboxes ?? [])];
}

/** Replaces everything with the demo data. */
export function seed(): void {
	mailboxes.clear();
	organizations.clear();

	organizations.set('t-northwind', {
		name: 'Northwind Traders',
		people: [
			{ id: 'u-ada', displayName: 'Ada Brandt', email: 'ada@northwind.example' },
			{ id: 'u-cyrus', displayName: 'Cyrus Oduya', email: 'cyrus@northwind.example' },
			{ id: 'u-bea', displayName: 'Bea Lindqvist', email: 'bea@northwind.example' }
		],
		sharedMailboxes: ['support@northwind.example', 'billing@northwind.example']
	});
	organizations.set('t-fabrikam', {
		name: 'Fabrikam',
		people: [
			{ id: 'u-ines', displayName: 'Ines Morel', email: 'ines@fabrikam.example' },
			{ id: 'u-dev', displayName: 'Dev Raman', email: 'dev@fabrikam.example' }
		],
		sharedMailboxes: ['hello@fabrikam.example']
	});

	mailboxes.set('u-ada', {
		folders: ['Inbox', 'Sent', 'Drafts', 'Receipts', 'Archive'],
		messages: [
			{
				id: 'm-1',
				folder: 'Inbox',
				from: 'accounts@contoso.example',
				subject: 'Invoice 2211 for October',
				body: 'Hello Ada, please find attached invoice 2211 for the October delivery of 40 cases. Payment is due within 30 days.',
				receivedAt: '2026-11-03T09:12:00Z'
			},
			{
				id: 'm-2',
				folder: 'Inbox',
				from: 'cyrus@northwind.example',
				subject: 'Lunch on Friday?',
				body: 'Are you free for lunch on Friday? The new place on Dock Street opens this week.',
				receivedAt: '2026-11-05T11:40:00Z'
			},
			{
				id: 'm-3',
				folder: 'Receipts',
				from: 'no-reply@rail.example',
				subject: 'Your ticket receipt',
				body: 'Thank you for travelling with us. Your receipt for the return ticket is attached.',
				receivedAt: '2026-10-28T17:03:00Z'
			}
		]
	});
}
