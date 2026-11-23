/** The front matter of a help article, the lines between the two `---`, as an object. */
export const readFrontMatter = (text) => {
	const [, block = ''] = text.split('---\n');
	return Object.fromEntries(
		block
			.split('\n')
			.filter((line) => line.includes(':'))
			.map((line) => {
				const [key, value] = line.split(':');
				return [key.trim(), value.trim()];
			})
	);
};
