/** The URL slug of a page title: lower case, with hyphens between words. */
export const slugify = (title) => title.toLowerCase().replace(/[^a-z0-9]/g, '-');

/** How long an article takes to read at 200 words a minute, as shown under its title. */
export const readingTime = (text) => {
	const words = text.split(/\s+/).filter(Boolean).length;
	return `${Math.floor(words / 200)} min read`;
};

/** A plan price in US dollars, as the pricing page and the upgrade screen show it. */
export const formatPrice = (amount) => `$${amount}`;
