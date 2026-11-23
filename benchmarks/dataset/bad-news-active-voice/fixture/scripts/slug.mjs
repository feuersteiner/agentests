/** The URL slug of a blog post's title: lower case, its words joined by hyphens. */
export const slugify = (title) => title.trim().toLowerCase().split(/\s+/).join('-');
