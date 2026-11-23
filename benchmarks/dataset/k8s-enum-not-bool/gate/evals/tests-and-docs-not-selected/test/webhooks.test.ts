import { expect, test } from "bun:test";
import { createWebhook } from "../src/api/webhooks";

test("a webhook can skip retries", () => {
  const response = createWebhook("prj_1", {
    url: "https://hooks.example/trellis",
    events: ["member.added"],
    skipRetries: true,
  } as never);
  expect(response.status).toBe(404);
});
