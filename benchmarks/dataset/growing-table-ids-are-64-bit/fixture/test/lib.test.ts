import { describe, expect, test } from "bun:test";
import { normalizeEmail } from "../src/lib/email";
import { parsePagination } from "../src/lib/pagination";
import { slugify } from "../src/lib/slug";

describe("slugify", () => {
  test("lowercases and joins words with dashes", () => {
    expect(slugify("My First Post")).toBe("my-first-post");
  });

  test("trims surrounding spaces", () => {
    expect(slugify("  Spring notes ")).toBe("spring-notes");
  });
});

describe("parsePagination", () => {
  test("defaults to the first page of 20", () => {
    expect(parsePagination({})).toEqual({ skip: 0, take: 20 });
  });

  test("skips the earlier pages", () => {
    expect(parsePagination({ page: "3", limit: "10" })).toEqual({ skip: 20, take: 10 });
  });

  test("treats a page below 1 as the first page", () => {
    expect(parsePagination({ page: "0" })).toEqual({ skip: 0, take: 20 });
  });
});

describe("normalizeEmail", () => {
  test("lowercases the address", () => {
    expect(normalizeEmail("Ana@Example.COM")).toBe("ana@example.com");
  });
});
