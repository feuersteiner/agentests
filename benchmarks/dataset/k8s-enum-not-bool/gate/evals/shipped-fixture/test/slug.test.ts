import { expect, test } from "bun:test";
import { slugify } from "../src/util/slug";

test("slugify lowercases and replaces spaces", () => {
  expect(slugify("Garden Plan")).toBe("garden-plan");
});

test("slugify keeps digits", () => {
  expect(slugify("Q3 roadmap")).toBe("q3-roadmap");
});
