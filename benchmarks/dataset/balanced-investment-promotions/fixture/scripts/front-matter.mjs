/** Returns the front matter at the top of a Markdown file as an object, or null when it has none. */
export function parseFrontMatter(text) {
	const lines = text.split(/\r?\n/);
	if (lines[0]?.trim() !== '---') return null;
	const fields = {};
	for (const line of lines.slice(1)) {
		if (line.trim() === '---') return fields;
		const colon = line.indexOf(':');
		if (colon === -1) continue;
		fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
	}
	return null;
}
