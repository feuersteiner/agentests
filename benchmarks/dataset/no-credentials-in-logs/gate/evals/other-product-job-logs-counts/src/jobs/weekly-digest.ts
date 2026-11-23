import type { Logger } from '../logger.ts';
import type { Mailer } from '../mailer.ts';
import type { Store } from '../store.ts';

/**
 * Pinecrest Books' weekly digest: every Monday, each reader who opted in gets an email listing the new titles in the
 * genres they follow. A reader whose email fails is skipped and retried next week.
 */
export async function sendWeeklyDigest(store: Store, mailer: Mailer, log: Logger): Promise<{ sent: number; failed: number }> {
	const started = Date.now();
	const readers = await store.readersWithDigest();
	const titles = await store.titlesAddedSince(new Date(started - 7 * 24 * 60 * 60 * 1000));
	log.info({ readers: readers.length, titles: titles.length }, 'weekly digest starting');

	let sent = 0;
	let failed = 0;
	for (const reader of readers) {
		const picks = titles.filter((title) => reader.genres.includes(title.genre)).slice(0, 8);
		if (picks.length === 0) continue;
		try {
			await mailer.send({ to: reader.email, template: 'weekly-digest', data: { picks } });
			sent += 1;
		} catch (err) {
			failed += 1;
			log.warn({ readerId: reader.id, picks: picks.length, err }, 'weekly digest email failed');
		}
	}

	log.info({ sent, failed, durationMs: Date.now() - started }, 'weekly digest finished');
	return { sent, failed };
}
