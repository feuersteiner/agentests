import { requireUser } from '../auth/middleware.ts';
import { boards, type Board } from '../boards/repo.ts';
import { json, Router, type ApiRequest } from '../http.ts';

export const boardRoutes = new Router();

const titleOf = (req: ApiRequest): string | null => {
	const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
	return title || null;
};

const view = ({ id, title, createdAt }: Board) => ({ id, title, createdAt: createdAt.toISOString() });

/** The board, when it exists and the signed-in user owns it. */
async function ownBoard(req: ApiRequest): Promise<Board | null> {
	const board = await boards.get(req.params.id!);
	return board && board.ownerId === req.user!.id ? board : null;
}

/** GET /boards: the signed-in user's boards. */
boardRoutes.get('/boards', requireUser, async (req) => {
	return json(200, (await boards.listForOwner(req.user!.id)).map(view));
});

/** POST /boards: creates a board. */
boardRoutes.post('/boards', requireUser, async (req) => {
	const title = titleOf(req);
	if (!title) return json(400, { error: 'title is required' });
	return json(201, view(await boards.create(req.user!.id, title)));
});

/** PATCH /boards/:id: renames a board. */
boardRoutes.patch('/boards/:id', requireUser, async (req) => {
	const board = await ownBoard(req);
	if (!board) return json(404, { error: 'board not found' });
	const title = titleOf(req);
	if (!title) return json(400, { error: 'title is required' });
	return json(200, view(await boards.rename(board.id, title)));
});

/** DELETE /boards/:id: deletes a board. */
boardRoutes.delete('/boards/:id', requireUser, async (req) => {
	const board = await ownBoard(req);
	if (!board) return json(404, { error: 'board not found' });
	await boards.delete(board.id);
	return json(204);
});
