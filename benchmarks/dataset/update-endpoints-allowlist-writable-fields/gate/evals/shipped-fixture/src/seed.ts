import { db } from './db.ts';
import { fingerprint } from './keys/parse.ts';

const BEN_LAPTOP = 'AAAAC3NzaC1lZDI1NTE5AAAAIISFd3o8rf4g6T1IVDXFSzLNxVMdLpOaWzUu3xUuH21f';
const BEN_BUILD = 'AAAAC3NzaC1lZDI1NTE5AAAAIGWhnGNzAa1ttmjntVJYVWfxqB602aqB76tN/vsB6ZU8';
const MIRA_DESK = 'AAAAC3NzaC1lZDI1NTE5AAAAIPfAHFrX03oKdceh+4ZmmJcJTJZF8K+oNok+L0cExat+';
const CLEO_LAPTOP = 'AAAAC3NzaC1lZDI1NTE5AAAAIPeO6rjbvAJ+goKWq6Z/yQSYwn/p5T0Xrie0yG1GEf4A';

function key(id: string, userId: string, title: string, data: string, createdAt: string) {
	return { id, userId, title, key: `ssh-ed25519 ${data}`, fingerprint: fingerprint(data), createdAt };
}

/** Fills the tables with two organisations and their people, keys and projects, for local runs and tests. */
export function seed(): void {
	db.org.reset([
		{ id: 'org_1', name: 'Saltmarsh', createdAt: '2025-11-03T09:00:00.000Z' },
		{ id: 'org_2', name: 'Ferrow Maps', createdAt: '2026-02-17T14:30:00.000Z' }
	]);
	db.user.reset([
		{ id: 'usr_1', orgId: 'org_1', email: 'mira@saltmarsh.example.com', displayName: 'Mira Sato', bio: 'Platform team.', role: 'admin', createdAt: '2025-11-03T09:05:00.000Z' },
		{ id: 'usr_2', orgId: 'org_1', email: 'ben@saltmarsh.example.com', displayName: 'Ben Okafor', bio: '', role: 'member', createdAt: '2025-11-10T10:00:00.000Z' },
		{ id: 'usr_3', orgId: 'org_2', email: 'cleo@ferrow.example.com', displayName: 'Cleo Marsh', bio: 'Maps and tiles.', role: 'admin', createdAt: '2026-02-17T14:35:00.000Z' },
		{ id: 'usr_4', orgId: 'org_1', email: 'aisha@saltmarsh.example.com', displayName: 'aisha khan', bio: '', role: 'member', createdAt: '2026-04-01T08:20:00.000Z' }
	]);
	db.session.reset([
		{ id: 'tok_mira', userId: 'usr_1', createdAt: '2026-11-20T08:00:00.000Z' },
		{ id: 'tok_ben', userId: 'usr_2', createdAt: '2026-11-20T08:00:00.000Z' },
		{ id: 'tok_cleo', userId: 'usr_3', createdAt: '2026-11-20T08:00:00.000Z' },
		{ id: 'tok_aisha', userId: 'usr_4', createdAt: '2026-11-20T08:00:00.000Z' }
	]);
	db.publicKey.reset([
		key('key_1', 'usr_2', 'laptop', BEN_LAPTOP, '2026-03-02T11:00:00.000Z'),
		key('key_2', 'usr_2', 'build server', BEN_BUILD, '2026-05-14T16:45:00.000Z'),
		key('key_3', 'usr_1', 'desk', MIRA_DESK, '2026-01-20T09:10:00.000Z'),
		key('key_4', 'usr_3', 'laptop', CLEO_LAPTOP, '2026-02-18T07:55:00.000Z')
	]);
	db.project.reset([
		{ id: 'prj_1', orgId: 'org_1', ownerId: 'usr_1', name: 'Cairn API', slug: 'cairn-api', description: 'This service.', createdAt: '2025-11-03T09:30:00.000Z' },
		{ id: 'prj_2', orgId: 'org_1', ownerId: 'usr_2', name: 'Docs Site', slug: 'docs-site', description: '', createdAt: '2025-12-01T13:00:00.000Z' },
		{ id: 'prj_3', orgId: 'org_2', ownerId: 'usr_3', name: 'Tile Server', slug: 'tile-server', description: 'Vector tiles.', createdAt: '2026-02-18T08:00:00.000Z' }
	]);
}
