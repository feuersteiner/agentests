// Pinecrest Notes keeps each workspace's settings in Postgres and reads them on nearly every
// request, so they are cached in Redis for a minute.

import type { Redis } from '../redis.ts';
import { loadWorkspaceSettings, type WorkspaceSettings } from './store.ts';

const TTL_SECONDS = 60;

interface Entry {
	workspaceId: string;
	settings: WorkspaceSettings;
}

export function createSettingsCache(redis: Redis) {
	const keyFor = (workspaceId: string) => `settings:v2:${workspaceId}`;

	return {
		/** The workspace's settings, from Redis when a fresh copy is there. */
		async get(workspaceId: string): Promise<WorkspaceSettings> {
			const raw = await redis.get(keyFor(workspaceId));
			if (raw !== null) {
				const entry = JSON.parse(raw) as Entry;
				if (entry.workspaceId === workspaceId) return entry.settings;
			}
			const settings = await loadWorkspaceSettings(workspaceId);
			const entry: Entry = { workspaceId, settings };
			await redis.set(keyFor(workspaceId), JSON.stringify(entry), 'EX', TTL_SECONDS);
			return settings;
		},

		/** Drops the cached copy after the workspace's settings change. */
		async invalidate(workspaceId: string): Promise<void> {
			await redis.del(keyFor(workspaceId));
		}
	};
}
