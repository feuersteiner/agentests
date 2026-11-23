/** A delivery estimate in words, from the number of whole days until delivery. */
export const formatEta = (days) => {
	if (days === 0) return 'today';
	if (days === 1) return 'tomorrow';
	if (days < 7) return `in ${days} days`;
	const weeks = Math.round(days / 7);
	return `in ${weeks} weeks`;
};
