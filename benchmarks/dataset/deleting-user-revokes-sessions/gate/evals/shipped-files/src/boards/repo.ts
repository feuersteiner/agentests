import { randomUUID } from 'node:crypto';

// Boards. Production keeps them in the Postgres table boards; this in-memory version behaves the
// same way and backs the tests and local runs.

export interface Board {
	id: string;
	ownerId: string;
	title: string;
	createdAt: Date;
}

const rows = new Map<string, Board>();

export const boards = {
	async create(ownerId: string, title: string): Promise<Board> {
		const board: Board = { id: `brd_${randomUUID()}`, ownerId, title, createdAt: new Date() };
		rows.set(board.id, board);
		return { ...board };
	},

	async get(id: string): Promise<Board | null> {
		const board = rows.get(id);
		return board ? { ...board } : null;
	},

	/** The owner's boards, oldest first. */
	async listForOwner(ownerId: string): Promise<Board[]> {
		return [...rows.values()].filter((board) => board.ownerId === ownerId).map((board) => ({ ...board }));
	},

	async rename(id: string, title: string): Promise<Board> {
		const board = rows.get(id);
		if (!board) throw new Error(`Unknown board ${id}`);
		board.title = title;
		return { ...board };
	},

	async delete(id: string): Promise<void> {
		rows.delete(id);
	},

	async deleteAllForOwner(ownerId: string): Promise<void> {
		for (const board of rows.values()) if (board.ownerId === ownerId) rows.delete(board.id);
	},

	/** Empties the table; for tests. */
	reset(): void {
		rows.clear();
	}
};
