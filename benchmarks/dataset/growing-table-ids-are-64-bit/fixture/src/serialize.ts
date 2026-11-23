export type PostRow = {
  id: bigint;
  authorId: bigint;
  title: string;
  slug: string;
  body: string;
  publishedAt: Date | null;
  createdAt: Date;
};

export type UserRow = {
  id: bigint;
  email: string;
  displayName: string;
  bio: string | null;
  createdAt: Date;
};

export function toPostJSON(post: PostRow) {
  return {
    id: post.id.toString(),
    authorId: post.authorId.toString(),
    title: post.title,
    slug: post.slug,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
  };
}

export function toUserJSON(user: UserRow) {
  return {
    id: user.id.toString(),
    displayName: user.displayName,
    bio: user.bio,
    joinedAt: user.createdAt.toISOString(),
  };
}
