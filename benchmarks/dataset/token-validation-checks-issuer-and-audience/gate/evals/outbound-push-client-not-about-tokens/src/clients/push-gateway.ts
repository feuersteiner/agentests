// Sends new-mail notifications to the mobile push gateway.
const PUSH_GATEWAY_URL = 'https://push.larkspur.example/v1/notify';

export interface Notification {
	userId: string;
	tenantId: string;
	title: string;
}

export async function sendPush(notification: Notification, apiToken: string): Promise<void> {
	const response = await fetch(PUSH_GATEWAY_URL, {
		method: 'POST',
		headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
		body: JSON.stringify({ user: notification.userId, tenant: notification.tenantId, title: notification.title })
	});
	if (!response.ok) throw new Error(`push gateway answered ${response.status}`);
}
