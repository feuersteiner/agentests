import { beforeEach, expect, test } from "bun:test";
import { authorize, createKey, listKeys } from "../src/api/keys";
import { addMember, createProject, getProject, updateProjectSettings } from "../src/api/projects";
import type { ApiKey, Member, Project, ProjectSettings, User, Webhook } from "../src/api/types";
import { createWebhook, deliver, listWebhooks, MAX_ATTEMPTS } from "../src/api/webhooks";
import { clearOutbox, outbox } from "../src/mailer";
import { resetStore, store } from "../src/store";

const noSleep = async () => {};

function addUser(id: string, overrides: Partial<User> = {}): User {
  const user: User = {
    id,
    email: `${id}@fernhill.example`,
    name: id,
    emailVerified: true,
    twoFactorEnrolledAt: null,
    ...overrides,
  };
  store.users.set(id, user);
  return user;
}

function newProject(name = "Garden Plan"): Project {
  return createProject("ana", { name }).body as Project;
}

beforeEach(() => {
  resetStore();
  clearOutbox();
  addUser("ana");
  addUser("ben");
});

// Projects

test("createProject applies the default settings", () => {
  const response = createProject("ana", { name: "Garden Plan" });
  expect(response.status).toBe(201);
  const project = response.body as Project;
  expect(project.slug).toBe("garden-plan");
  expect(project.settings).toEqual({ visibility: "private", defaultRole: "member" });
  expect(project.members).toHaveLength(1);
});

test("createProject rejects an unknown visibility", () => {
  const response = createProject("ana", {
    name: "Garden Plan",
    settings: { visibility: "secret" as never },
  });
  expect(response.status).toBe(400);
});

test("only the owner can update settings", () => {
  const project = newProject();
  expect(updateProjectSettings(project.id, "ben", { visibility: "team" }).status).toBe(403);
  const response = updateProjectSettings(project.id, "ana", { visibility: "team" });
  expect(response.status).toBe(200);
  expect((response.body as ProjectSettings).visibility).toBe("team");
  expect((getProject(project.id).body as Project).settings.defaultRole).toBe("member");
});

test("addMember uses the project's default role and emails the member", () => {
  const project = newProject();
  updateProjectSettings(project.id, "ana", { defaultRole: "viewer" });
  const response = addMember(project.id, "ana", { userId: "ben" });
  expect(response.status).toBe(201);
  expect((response.body as Member).role).toBe("viewer");
  expect(outbox).toHaveLength(1);
  expect(outbox[0].to).toBe("ben@fernhill.example");
});

test("addMember refuses to add a second owner", () => {
  const project = newProject();
  expect(addMember(project.id, "ana", { userId: "ben", role: "owner" }).status).toBe(400);
});

// Webhooks

test("createWebhook defaults to the json payload format", () => {
  const project = newProject();
  const response = createWebhook(project.id, {
    url: "https://hooks.example/trellis",
    events: ["member.added"],
  });
  expect(response.status).toBe(201);
  expect((response.body as Webhook).payloadFormat).toBe("json");
  expect((listWebhooks(project.id).body as Webhook[]).length).toBe(1);
});

test("deliver stops at the first accepted attempt", async () => {
  const project = newProject();
  const webhook = createWebhook(project.id, {
    url: "https://hooks.example/trellis",
    events: ["member.added"],
  }).body as Webhook;
  const statuses = [503, 200];
  const result = await deliver(webhook, "member.added", { userId: "ben" }, async () => statuses.shift()!, noSleep);
  expect(result).toEqual({ delivered: true, attempts: 2, lastStatus: 200 });
});

test("deliver gives up after the maximum number of attempts", async () => {
  const project = newProject();
  const webhook = createWebhook(project.id, {
    url: "https://hooks.example/trellis",
    events: ["member.added"],
  }).body as Webhook;
  let calls = 0;
  const result = await deliver(
    webhook,
    "member.added",
    { userId: "ben" },
    async () => {
      calls += 1;
      return 502;
    },
    noSleep,
  );
  expect(calls).toBe(MAX_ATTEMPTS);
  expect(result).toEqual({ delivered: false, attempts: MAX_ATTEMPTS, lastStatus: 502 });
});

// API keys

test("createKey returns the secret and its prefix", () => {
  const project = newProject();
  const response = createKey(project.id, { name: "CI" });
  expect(response.status).toBe(201);
  const key = response.body as ApiKey;
  expect(key.secret.startsWith("trl_")).toBe(true);
  expect(key.prefix).toBe(key.secret.slice(0, 8));
  expect((listKeys(project.id).body as ApiKey[]).length).toBe(1);
});

test("authorize finds the key's project", () => {
  const project = newProject();
  const key = createKey(project.id, { name: "CI" }).body as ApiKey;
  expect(authorize(key.secret, "POST")).toEqual({
    status: 200,
    body: { keyId: key.id, projectId: project.id },
  });
  expect(authorize("trl_nope", "GET").status).toBe(401);
});
