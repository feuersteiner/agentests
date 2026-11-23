import { store } from "../store";
import { nextId } from "../util/ids";
import {
  DEFAULT_PAYLOAD_FORMAT,
  DEFAULT_RETRY_POLICY,
  type ApiResponse,
  type CreateWebhookRequest,
  type DeliveryResult,
  type PayloadFormat,
  type RetryPolicy,
  type Webhook,
  type WebhookEvent,
} from "./types";

const EVENTS: WebhookEvent[] = ["project.updated", "member.added"];
const FORMATS: PayloadFormat[] = ["json", "form"];
const RETRY_POLICIES: RetryPolicy[] = ["exponential", "none"];

export const MAX_ATTEMPTS = 3;
export const BACKOFF_BASE_MS = 500;

/** Posts a body to a URL and resolves with the HTTP status; rejects on a network error. */
export type Send = (url: string, body: string, contentType: string) => Promise<number>;

export type Sleep = (ms: number) => Promise<void>;

const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createWebhook(projectId: string, request: CreateWebhookRequest): ApiResponse<Webhook> {
  if (!store.projects.has(projectId)) {
    return { status: 404, body: { error: "project not found" } };
  }
  if (typeof request.url !== "string" || request.url === "") {
    return { status: 400, body: { error: "url is required" } };
  }
  if (!Array.isArray(request.events) || request.events.length === 0) {
    return { status: 400, body: { error: "events must list at least one event" } };
  }
  if (request.events.some((event) => !EVENTS.includes(event))) {
    return { status: 400, body: { error: `events must be among ${EVENTS.join(", ")}` } };
  }
  const payloadFormat = request.payloadFormat ?? DEFAULT_PAYLOAD_FORMAT;
  if (!FORMATS.includes(payloadFormat)) {
    return { status: 400, body: { error: "payloadFormat must be json or form" } };
  }
  const retryPolicy = request.retryPolicy ?? DEFAULT_RETRY_POLICY;
  if (!RETRY_POLICIES.includes(retryPolicy)) {
    return { status: 400, body: { error: "retryPolicy must be exponential or none" } };
  }
  const webhook: Webhook = {
    id: nextId("whk"),
    projectId,
    url: request.url,
    events: request.events,
    payloadFormat,
    retryPolicy,
  };
  store.webhooks.set(webhook.id, webhook);
  return { status: 201, body: webhook };
}

export function listWebhooks(projectId: string): ApiResponse<Webhook[]> {
  if (!store.projects.has(projectId)) {
    return { status: 404, body: { error: "project not found" } };
  }
  const webhooks = [...store.webhooks.values()].filter((webhook) => webhook.projectId === projectId);
  return { status: 200, body: webhooks };
}

function encode(webhook: Webhook, event: WebhookEvent, payload: Record<string, string>) {
  if (webhook.payloadFormat === "form") {
    const form = new URLSearchParams({ event, ...payload });
    return { body: form.toString(), contentType: "application/x-www-form-urlencoded" };
  }
  return { body: JSON.stringify({ event, payload }), contentType: "application/json" };
}

export async function deliver(
  webhook: Webhook,
  event: WebhookEvent,
  payload: Record<string, string>,
  send: Send,
  sleep: Sleep = realSleep,
): Promise<DeliveryResult> {
  const { body, contentType } = encode(webhook, event, payload);
  const maxAttempts = webhook.retryPolicy === "none" ? 1 : MAX_ATTEMPTS;
  let lastStatus: number | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      lastStatus = await send(webhook.url, body, contentType);
      if (lastStatus < 500) {
        return { delivered: lastStatus < 400, attempts: attempt, lastStatus };
      }
    } catch {
      // A network error counts as a failed attempt.
    }
    if (attempt < maxAttempts) {
      await sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1));
    }
  }
  return { delivered: false, attempts: maxAttempts, lastStatus };
}
