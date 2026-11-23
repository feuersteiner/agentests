// Request and response types of the Trellis API, and the defaults of its settings.

export interface ApiError {
  error: string;
}

export interface ApiResponse<T> {
  status: number;
  body: T | ApiError;
}

// Users

export interface User {
  id: string;
  email: string;
  name: string;
  /** Whether the user has confirmed the address by following the emailed link. */
  emailVerified: boolean;
  /** When the user enrolled a second factor, or null when they have not. */
  twoFactorEnrolledAt: string | null;
}

// Projects

export type Visibility = "private" | "team" | "public";

export type Role = "owner" | "member" | "viewer";

export interface ProjectSettings {
  /** Who can see the project. */
  visibility: Visibility;
  /** The role of a member who is added without one. Never "owner". */
  defaultRole: Role;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  visibility: "private",
  defaultRole: "member",
};

export interface Member {
  userId: string;
  role: Role;
  addedAt: string;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  settings: ProjectSettings;
  members: Member[];
}

export interface CreateProjectRequest {
  name: string;
  settings?: Partial<ProjectSettings>;
}

export type UpdateProjectSettingsRequest = Partial<ProjectSettings>;

export interface AddMemberRequest {
  userId: string;
  role?: Role;
}

// Webhooks

export type WebhookEvent = "project.updated" | "member.added";

export type PayloadFormat = "json" | "form";

export const DEFAULT_PAYLOAD_FORMAT: PayloadFormat = "json";

export interface Webhook {
  id: string;
  projectId: string;
  url: string;
  events: WebhookEvent[];
  payloadFormat: PayloadFormat;
}

export interface CreateWebhookRequest {
  url: string;
  events: WebhookEvent[];
  payloadFormat?: PayloadFormat;
}

export interface DeliveryResult {
  /** Whether the receiver accepted the payload. */
  delivered: boolean;
  attempts: number;
  /** The last HTTP status received, or null when no attempt got an answer. */
  lastStatus: number | null;
}

// API keys

export interface ApiKey {
  id: string;
  projectId: string;
  name: string;
  secret: string;
  prefix: string;
  createdAt: string;
}

export interface CreateKeyRequest {
  name: string;
}

export interface KeySummary {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
}

export interface KeyIdentity {
  keyId: string;
  projectId: string;
}
