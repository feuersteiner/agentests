import { json, type ApiRequest, type ApiResponse } from '../http.ts';

const MAX_LENGTH = 20_000;

function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** POST /preview: renders a project description's Markdown headings and paragraphs as HTML, without saving it. */
export function previewMarkdown(req: ApiRequest): ApiResponse {
	const { markdown } = req.body;
	if (typeof markdown !== 'string') return json(400, { error: 'markdown must be a string' });
	if (markdown.length > MAX_LENGTH) return json(413, { error: `markdown is over ${MAX_LENGTH} characters` });

	const html = markdown
		.split(/\n{2,}/)
		.map((block) => {
			const heading = block.match(/^(#{1,3}) (.*)$/);
			if (heading) return `<h${heading[1].length}>${escapeHtml(heading[2])}</h${heading[1].length}>`;
			return `<p>${escapeHtml(block)}</p>`;
		})
		.join('\n');
	return json(200, { html });
}
