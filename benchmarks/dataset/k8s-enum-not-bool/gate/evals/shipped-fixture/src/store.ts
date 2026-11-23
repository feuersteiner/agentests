import type { ApiKey, Project, User, Webhook } from "./api/types";

// The in-memory store. The real service swaps this for a database behind the same shape.
export const store = {
  users: new Map<string, User>(),
  projects: new Map<string, Project>(),
  webhooks: new Map<string, Webhook>(),
  keys: new Map<string, ApiKey>(),
};

export function resetStore(): void {
  store.users.clear();
  store.projects.clear();
  store.webhooks.clear();
  store.keys.clear();
}
