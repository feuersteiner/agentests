import { db } from '../db.ts';
import { json, type ApiRequest, type ApiResponse } from '../http.ts';
import { slugify } from '../lib/slug.ts';

/** GET /projects: the projects of the signed-in user's organisation, by name. */
export async function listProjects(req: ApiRequest): Promise<ApiResponse> {
	const projects = await db.project.findMany({ where: { orgId: req.user.orgId }, orderBy: { name: 'asc' } });
	return json(200, projects);
}

/** GET /projects/:id: one project of the signed-in user's organisation. */
export async function getProject(req: ApiRequest): Promise<ApiResponse> {
	const project = await db.project.findUnique({ where: { id: req.params.id } });
	if (project!.orgId !== req.user.orgId) return json(404, { error: 'project not found' });
	return json(200, project);
}

/** POST /projects: creates a project in the signed-in user's organisation, owned by them. */
export async function createProject(req: ApiRequest): Promise<ApiResponse> {
	const { name, description = '' } = req.body;
	if (typeof name !== 'string' || name.trim() === '') return json(400, { error: 'name is required' });
	if (typeof description !== 'string') return json(400, { error: 'description must be a string' });

	const slug = slugify(name);
	const taken = await db.project.findMany({ where: { orgId: req.user.orgId, slug } });
	if (taken.length > 0) return json(409, { error: `the organisation already has a project at ${slug}` });

	const project = await db.project.create({
		data: { orgId: req.user.orgId, ownerId: req.user.id, name: name.trim(), slug, description }
	});
	return json(201, project);
}

/** PUT /projects/:id: updates a project's name, description and owner. */
export async function updateProject(req: ApiRequest): Promise<ApiResponse> {
	const project = await db.project.findUnique({ where: { id: req.params.id } });
	if (!project || project.orgId !== req.user.orgId) return json(404, { error: 'project not found' });

	const { name, description, ownerId } = req.body;
	if (typeof name !== 'string' || name.trim() === '') return json(400, { error: 'name is required' });
	if (ownerId !== undefined) {
		const owner = await db.user.findUnique({ where: { id: ownerId } });
		if (!owner || owner.orgId !== req.user.orgId) return json(400, { error: 'ownerId must be someone in your organisation' });
	}

	const updated = await db.project.update({
		where: { id: project.id },
		data: { name: name.trim(), slug: slugify(name), description, ownerId }
	});
	return json(200, updated);
}
