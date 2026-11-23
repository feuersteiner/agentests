/** The URL slug of a project name: lower case, with each run of other characters turned into one dash. */
export function slugify(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
