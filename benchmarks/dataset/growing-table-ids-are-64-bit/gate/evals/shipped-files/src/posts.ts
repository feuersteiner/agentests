import { db } from "./db";
import { parsePagination } from "./lib/pagination";
import { slugify } from "./lib/slug";

export async function createPost(authorId: bigint, title: string, body: string) {
  return db.post.create({
    data: { authorId, title, slug: slugify(title), body },
  });
}

export async function publishPost(postId: bigint) {
  return db.post.update({
    where: { id: postId },
    data: { publishedAt: new Date() },
  });
}

export async function listPosts(query: { page?: string; limit?: string }) {
  const { skip, take } = parsePagination(query);
  return db.post.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    skip,
    take,
  });
}
