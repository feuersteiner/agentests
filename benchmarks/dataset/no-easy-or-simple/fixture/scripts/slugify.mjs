/** Turns an article title into the slug used for its file name and URL. */
export const slugify = (title) =>
	title
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '-');
