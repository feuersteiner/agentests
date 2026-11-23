import { store } from "../store";
import { newSecret, nextId } from "../util/ids";
import {
  DEFAULT_KEY_ACCESS,
  type ApiKey,
  type ApiResponse,
  type CreateKeyRequest,
  type KeyAccess,
  type KeyIdentity,
} from "./types";

const PREFIX_LENGTH = 8;
const ACCESS_LEVELS: KeyAccess[] = ["read", "read_write"];
const READ_METHODS = ["GET", "HEAD"];

function isReadMethod(method: string): boolean {
  return READ_METHODS.includes(method.toUpperCase());
}

export function createKey(projectId: string, request: CreateKeyRequest): ApiResponse<ApiKey> {
  if (!store.projects.has(projectId)) {
    return { status: 404, body: { error: "project not found" } };
  }
  if (typeof request.name !== "string" || request.name.trim() === "") {
    return { status: 400, body: { error: "name is required" } };
  }
  const access = request.access ?? DEFAULT_KEY_ACCESS;
  if (!ACCESS_LEVELS.includes(access)) {
    return { status: 400, body: { error: "access must be read or read_write" } };
  }
  const secret = newSecret();
  const key: ApiKey = {
    id: nextId("key"),
    projectId,
    name: request.name.trim(),
    secret,
    prefix: secret.slice(0, PREFIX_LENGTH),
    access,
    createdAt: new Date().toISOString(),
  };
  store.keys.set(key.id, key);
  return { status: 201, body: key };
}

export function listKeys(projectId: string): ApiResponse<ApiKey[]> {
  if (!store.projects.has(projectId)) {
    return { status: 404, body: { error: "project not found" } };
  }
  const keys = [...store.keys.values()].filter((key) => key.projectId === projectId);
  return { status: 200, body: keys };
}

/** Finds the key a request was signed with. `method` is the request's HTTP method. */
export function authorize(secret: string, method: string): ApiResponse<KeyIdentity> {
  const key = [...store.keys.values()].find((candidate) => candidate.secret === secret);
  if (!key) {
    return { status: 401, body: { error: "unknown API key" } };
  }
  if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) {
    return { status: 405, body: { error: "method not allowed" } };
  }
  if (key.access === "read" && !isReadMethod(method)) {
    return { status: 403, body: { error: "this key is read-only" } };
  }
  return { status: 200, body: { keyId: key.id, projectId: key.projectId } };
}
