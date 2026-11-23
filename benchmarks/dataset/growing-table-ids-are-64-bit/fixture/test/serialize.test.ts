import { expect, test } from "bun:test";
import { toPostJSON, toUserJSON } from "../src/serialize";

const createdAt = new Date("2026-10-01T09:30:00.000Z");

test("toPostJSON sends ids as strings", () => {
  const json = toPostJSON({
    id: 42n,
    authorId: 7n,
    title: "Spring notes",
    slug: "spring-notes",
    body: "The first warm week.",
    publishedAt: null,
    createdAt,
  });
  expect(json.id).toBe("42");
  expect(json.authorId).toBe("7");
  expect(json.createdAt).toBe("2026-10-01T09:30:00.000Z");
});

test("toUserJSON leaves out the email address", () => {
  const json = toUserJSON({
    id: 7n,
    email: "ana@example.com",
    displayName: "Ana",
    bio: null,
    createdAt,
  });
  expect(json).toEqual({ id: "7", displayName: "Ana", bio: null, joinedAt: "2026-10-01T09:30:00.000Z" });
});
