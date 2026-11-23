import { sendEmail } from "../mailer";
import { store } from "../store";
import { nextId } from "../util/ids";
import { slugify } from "../util/slug";
import {
  DEFAULT_PROJECT_SETTINGS,
  type AddMemberRequest,
  type ApiResponse,
  type CreateProjectRequest,
  type Member,
  type Project,
  type ProjectSettings,
  type Role,
  type UpdateProjectSettingsRequest,
  type Visibility,
} from "./types";

const VISIBILITIES: Visibility[] = ["private", "team", "public"];
const ROLES: Role[] = ["owner", "member", "viewer"];

function checkSettings(settings: Partial<ProjectSettings>): string | null {
  if (settings.visibility !== undefined && !VISIBILITIES.includes(settings.visibility)) {
    return `visibility must be one of ${VISIBILITIES.join(", ")}`;
  }
  if (settings.defaultRole !== undefined) {
    if (!ROLES.includes(settings.defaultRole) || settings.defaultRole === "owner") {
      return "defaultRole must be member or viewer";
    }
  }
  return null;
}

export function createProject(ownerId: string, request: CreateProjectRequest): ApiResponse<Project> {
  if (!store.users.has(ownerId)) {
    return { status: 404, body: { error: "owner not found" } };
  }
  if (typeof request.name !== "string") {
    return { status: 400, body: { error: "name is required" } };
  }
  const problem = checkSettings(request.settings ?? {});
  if (problem) {
    return { status: 400, body: { error: problem } };
  }
  const project: Project = {
    id: nextId("prj"),
    slug: slugify(request.name),
    name: request.name,
    ownerId,
    settings: { ...DEFAULT_PROJECT_SETTINGS, ...request.settings },
    members: [{ userId: ownerId, role: "owner", addedAt: new Date().toISOString() }],
  };
  store.projects.set(project.id, project);
  return { status: 201, body: project };
}

export function getProject(projectId: string): ApiResponse<Project> {
  const project = store.projects.get(projectId);
  if (!project) {
    return { status: 404, body: { error: "project not found" } };
  }
  return { status: 200, body: project };
}

export function updateProjectSettings(
  projectId: string,
  actorId: string,
  request: UpdateProjectSettingsRequest,
): ApiResponse<ProjectSettings> {
  const project = store.projects.get(projectId);
  if (!project) {
    return { status: 404, body: { error: "project not found" } };
  }
  if (project.ownerId !== actorId) {
    return { status: 403, body: { error: "only the owner can change settings" } };
  }
  const problem = checkSettings(request);
  if (problem) {
    return { status: 400, body: { error: problem } };
  }
  project.settings = { ...project.settings, ...request };
  return { status: 200, body: project.settings };
}

export function addMember(
  projectId: string,
  actorId: string,
  request: AddMemberRequest,
): ApiResponse<Member> {
  const project = store.projects.get(projectId);
  if (!project) {
    return { status: 404, body: { error: "project not found" } };
  }
  if (project.ownerId !== actorId) {
    return { status: 403, body: { error: "only the owner can add members" } };
  }
  const user = store.users.get(request.userId);
  if (!user) {
    return { status: 404, body: { error: "user not found" } };
  }
  const role = request.role ?? project.settings.defaultRole;
  if (!ROLES.includes(role) || role === "owner") {
    return { status: 400, body: { error: "role must be member or viewer" } };
  }
  const member: Member = { userId: user.id, role, addedAt: new Date().toISOString() };
  project.members.push(member);
  sendEmail({
    to: user.email,
    subject: `You were added to ${project.name}`,
    text: `Hi ${user.name}, you are now a ${role} of ${project.name} on Trellis.`,
  });
  return { status: 201, body: member };
}
