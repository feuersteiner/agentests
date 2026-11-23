import { randomUUID } from 'node:crypto';

export interface List {
	id: string;
	ownerId: string;
	title: string;
	items: string[];
	createdAt: string;
	updatedAt: string;
}

const lists = new Map<string, List>();

/** The account's lists. */
export const listsForUser = (userId: string): List[] =>
	[...lists.values()].filter((list) => list.ownerId === userId);

export const createList = (ownerId: string, title: string, now: Date = new Date()): List => {
	const list: List = {
		id: randomUUID(),
		ownerId,
		title,
		items: [],
		createdAt: now.toISOString(),
		updatedAt: now.toISOString()
	};
	lists.set(list.id, list);
	return list;
};

export const addItem = (listId: string, item: string, now: Date = new Date()): List | undefined => {
	const list = lists.get(listId);
	if (!list) return undefined;
	list.items.push(item);
	list.updatedAt = now.toISOString();
	return list;
};

/** Forgets every list; for tests. */
export const clearLists = (): void => lists.clear();
