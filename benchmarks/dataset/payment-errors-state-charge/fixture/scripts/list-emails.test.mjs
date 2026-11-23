import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listEmails, readFrontmatter } from './list-emails.mjs';

test('readFrontmatter reads each key and value', () => {
	const text = '---\nsubject: Order confirmed\npreheader: Thanks\n---\n\nHi\n';
	assert.deepEqual(readFrontmatter(text), { subject: 'Order confirmed', preheader: 'Thanks' });
});

test('readFrontmatter keeps a colon inside a value', () => {
	const text = '---\nsubject: Order confirmed: box 1 of 4\n---\n';
	assert.equal(readFrontmatter(text).subject, 'Order confirmed: box 1 of 4');
});

test('readFrontmatter gives nothing without front matter', () => {
	assert.deepEqual(readFrontmatter('Hi there\n'), {});
});

test('listEmails reports a missing file and a missing subject', () => {
	const config = {
		emails: {
			transactional: [
				{ file: 'emails/a.md', trigger: 'a' },
				{ file: 'emails/b.md', trigger: 'b' },
				{ file: 'emails/c.md', trigger: 'c' }
			]
		}
	};
	const files = { 'emails/a.md': '---\nsubject: Hello\n---\n', 'emails/b.md': 'No front matter\n' };
	const lines = listEmails(config, (path) => files[path], (path) => path in files);
	assert.deepEqual(lines, ['a  Hello', 'b  NO SUBJECT emails/b.md', 'c  MISSING emails/c.md']);
});
