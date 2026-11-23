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

const EDITABLE = ['name', 'description'] as const;

/** PUT /projects/:id: updates a project's name and description. */
export async function updateProject(req: ApiRequest): Promise<ApiResponse> {
	const project = await db.project.findUnique({ where: { id: req.params.id } });
	if (!project || project.orgId !== req.user.orgId) return json(404, { error: 'project not found' });

	const data: { name?: string; description?: string; slug?: string } = {};
	for (const field of EDITABLE) {
		const value = req.body[field];
		if (value === undefined) continue;
		if (typeof value !== 'string') return json(400, { error: `${field} must be a string` });
		data[field] = value.trim();
	}
	if (data.name !== undefined) {
		if (data.name === '') return json(400, { error: 'name cannot be blank' });
		data.slug = slugify(data.name);
	}

	const updated = await db.project.update({ where: { id: project.id }, data });
	return json(200, updated);
}
