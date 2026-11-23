// Turns a project name into the slug used in its URL.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");
}
