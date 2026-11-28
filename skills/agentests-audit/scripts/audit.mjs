#!/usr/bin/env node
// agentests-audit runner. Replays a repository's recently merged PRs against rules compiled into
// agentests Tests, and reports which PRs added violations. The user's repository is never changed:
// all work happens in a detached git worktree and an output folder outside the repository.
//
//   node audit.mjs setup   [--repo .] [--out DIR] [--keys]
//   node audit.mjs evals   --out DIR
//   node audit.mjs replay  --out DIR [--prs 50] [--search 'merged:<2026-11-26']
//   node audit.mjs report  --out DIR
//   node audit.mjs cleanup --out DIR
//
// Keyless mode (default): every model stage (decide, reason) is removed before running, so agentests
// calls no model and only grep and glob run. Its findings are candidates; the agent running this skill
// judges each one. With --keys, the Tests run as written, with the keys from the repository's .env.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PLACEHOLDER = 'agentests-audit-keyless';
const INSTALLED = '.installed-by-audit';
const AGENT_PATTERN =
	/\b(devin|copilot|codex|cursor|claude|jules|sweep|aider|openhands|coderabbit|gemini|amp)\b/i;
const TRAILER_PATTERN =
	/co-authored-by:[^\n]*\b(claude|codex|cursor|devin|copilot|jules|aider|openhands|gemini|amp)\b|generated with \[?claude code/i;

const args = process.argv.slice(2);
const command = args[0];
const opt = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	if (i === -1) return fallback;
	const v = args[i + 1];
	return v === undefined || v.startsWith('--') ? true : v;
};

const die = (msg) => {
	console.error(`agentests-audit: ${msg}`);
	process.exit(2);
};
const run = (cmd, argv, o = {}) =>
	spawnSync(cmd, argv, { encoding: 'utf8', maxBuffer: 1 << 28, ...o });
const git = (cwd, ...argv) => {
	const r = run('git', ['-C', cwd, ...argv]);
	return r.status === 0 ? r.stdout : null;
};
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, '\t') + '\n');

const loadState = () => {
	const out = opt('out');
	if (!out || out === true) die('pass --out DIR (the folder setup printed)');
	const file = path.join(out, 'audit.json');
	if (!fs.existsSync(file)) die(`no audit.json in ${out}: run setup first`);
	return { out: path.resolve(out), ...readJson(file) };
};

const agentests = async (state) => {
	return import(path.join(state.tools, 'node_modules', 'agentests', 'dist', 'index.js'));
};

const cliEnv = (state) => {
	const env = { ...process.env };
	if (state.mode === 'keyless') {
		env.OPENAI_API_KEY ||= PLACEHOLDER;
		env.ANTHROPIC_API_KEY ||= PLACEHOLDER;
	}
	return env;
};

const cli = (state, argv, cwd) => {
	const bin = path.join(state.tools, 'node_modules', 'agentests', 'dist', 'cli', 'index.js');
	const envFile = path.join(state.repo, '.env');
	const nodeArgs = state.mode === 'keys' && fs.existsSync(envFile) ? [`--env-file=${envFile}`] : [];
	return run(process.execPath, [...nodeArgs, bin, ...argv], {
		cwd,
		env: cliEnv(state),
		timeout: 10 * 60e3
	});
};

// ---- Tests: the agent writes them in the worktree; replay snapshots and re-copies them ----

const testsIn = (dir) => path.join(dir, '.agents', 'tests');

/** Keyless copy: drop decide and reason stages. An assertion left with nothing to run is dropped and listed. */
const keylessCopy = (test) => {
	const dropped = [];
	const t = structuredClone(test);
	if (t.select?.decide !== undefined) {
		delete t.select.decide;
		if (!t.select.glob && !t.select.grep) t.select.glob = '**/*';
	}
	t.assert = t.assert
		.map((a) => {
			const rest = { ...a };
			delete rest.decide;
			delete rest.reason;
			return rest;
		})
		.filter((a) => {
			if (a.grep !== undefined) return true;
			dropped.push(`${t.id}/${a.id}`);
			return false;
		});
	return { test: t, dropped };
};

const installTests = async (state, target) => {
	const { parseTest } = await agentests(state);
	const src = path.join(state.out, 'tests');
	const dst = testsIn(target);
	fs.rmSync(dst, { recursive: true, force: true });
	fs.mkdirSync(dst, { recursive: true });
	const dropped = [];
	for (const id of fs.readdirSync(src)) {
		const from = path.join(src, id);
		if (!fs.existsSync(path.join(from, 'test.yaml'))) continue;
		fs.cpSync(from, path.join(dst, id), { recursive: true });
		if (state.mode === 'keyless') {
			const k = keylessCopy(parseTest(fs.readFileSync(path.join(from, 'test.yaml'), 'utf8')));
			dropped.push(...k.dropped);
			// YAML is a superset of JSON, so the stripped Test is written as JSON.
			if (k.test.assert.length)
				fs.writeFileSync(path.join(dst, id, 'test.yaml'), JSON.stringify(k.test, null, 2) + '\n');
			else fs.rmSync(path.join(dst, id), { recursive: true });
		}
	}
	fs.copyFileSync(
		path.join(state.out, 'agentests.config.yaml'),
		path.join(target, 'agentests.config.yaml')
	);
	fs.writeFileSync(
		path.join(path.dirname(dst), INSTALLED),
		'Copied by agentests-audit; the originals are in the output folder.\n'
	);
	return dropped;
};

/** Copies the Tests the agent wrote to the output folder, unless the worktree holds a copy installed by replay. */
const snapshotTests = (state) => {
	const from = testsIn(state.worktree);
	if (fs.existsSync(path.join(path.dirname(from), INSTALLED))) return;
	if (!fs.existsSync(from) || !fs.readdirSync(from).length)
		die(`no Tests in ${from}: write them there first (see SKILL.md, step 3)`);
	const to = path.join(state.out, 'tests');
	fs.rmSync(to, { recursive: true, force: true });
	fs.cpSync(from, to, { recursive: true });
};

// ---- setup ----

const setup = () => {
	const repo = path.resolve(opt('repo', '.'));
	const top = git(repo, 'rev-parse', '--show-toplevel')?.trim();
	if (!top) die(`${repo} is not inside a git repository`);
	const major = Number(process.versions.node.split('.')[0]);
	if (major < 22) die(`agentests needs Node 22 or later; this is Node ${process.versions.node}`);
	const name = path.basename(top);
	const stamp = new Date().toISOString().slice(0, 10);
	const out = path.resolve(opt('out', path.join(os.tmpdir(), `agentests-audit-${name}-${stamp}`)));
	const mode = opt('keys') ? 'keys' : 'keyless';
	fs.mkdirSync(out, { recursive: true });

	const tools = path.join(out, 'tools');
	if (!fs.existsSync(path.join(tools, 'node_modules', 'agentests'))) {
		fs.mkdirSync(tools, { recursive: true });
		const r = run(
			'npm',
			['install', '--prefix', tools, '--no-audit', '--no-fund', '--loglevel=error', 'agentests@^1'],
			{ stdio: 'inherit' }
		);
		if (r.status !== 0) die('npm install agentests failed');
	}

	const worktree = path.join(out, 'worktree');
	if (!fs.existsSync(worktree)) {
		const r = run('git', ['-C', top, 'worktree', 'add', '--detach', worktree, 'HEAD']);
		if (r.status !== 0) die(`git worktree add failed: ${r.stderr.trim()}`);
	}

	const repoConfig = path.join(top, 'agentests.config.yaml');
	const config =
		mode === 'keys' && fs.existsSync(repoConfig)
			? fs.readFileSync(repoConfig, 'utf8')
			: [
					'# Written by agentests-audit.',
					'decision:',
					'  api: openai',
					'  url: https://api.openai.com/v1',
					'  model: gpt-6-luna',
					'  apiKeyEnv: OPENAI_API_KEY',
					'reasoning:',
					'  api: anthropic',
					'  url: https://api.anthropic.com/v1',
					'  model: claude-sonnet-5-5',
					'  apiKeyEnv: ANTHROPIC_API_KEY',
					'select:',
					'  threshold: 0.5',
					'assert:',
					'  threshold: 0.5',
					''
				].join('\n');
	fs.writeFileSync(path.join(out, 'agentests.config.yaml'), config);
	fs.copyFileSync(
		path.join(out, 'agentests.config.yaml'),
		path.join(worktree, 'agentests.config.yaml')
	);
	fs.mkdirSync(testsIn(worktree), { recursive: true });

	const slug = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], {
		cwd: top
	});
	writeJson(path.join(out, 'audit.json'), {
		repo: top,
		slug: slug.status === 0 ? slug.stdout.trim() : null,
		worktree,
		tools,
		mode,
		createdAt: new Date().toISOString()
	});
	console.log(`out:      ${out}`);
	console.log(`worktree: ${worktree}  (write Tests in .agents/tests/ here)`);
	console.log(
		`mode:     ${mode}${mode === 'keyless' ? ' (grep and glob only; you judge the candidates)' : ''}`
	);
	console.log(
		`github:   ${slug.status === 0 ? slug.stdout.trim() : 'not found: replay will use first-parent history instead of merged PRs'}`
	);
	console.log(
		`agentests: node ${path.join(tools, 'node_modules', 'agentests', 'dist', 'cli', 'index.js')}`
	);
};

// ---- evals ----

const parseEvalOutput = (text) => {
	const results = [];
	let current = null;
	for (const line of text.split('\n')) {
		const name = line.match(/^Eval (.+)$/);
		if (name) current = name[1].trim();
		const verdict = line.match(/^([✓✗]) Expected (\w+), got (\w+)/);
		if (verdict && current)
			results.push({
				eval: current,
				ok: verdict[1] === '✓',
				expected: verdict[2],
				got: verdict[3]
			});
	}
	return results;
};

const evals = async () => {
	const state = loadState();
	snapshotTests(state);
	const scratch = fs.mkdtempSync(path.join(state.out, 'evals-'));
	const dropped = await installTests(state, scratch);
	let problems = 0;
	for (const id of fs
		.readdirSync(testsIn(scratch))
		.filter((d) => fs.statSync(path.join(testsIn(scratch), d)).isDirectory())) {
		const r = cli(state, ['eval', id], scratch);
		const results = parseEvalOutput(r.stdout + r.stderr);
		if (!results.length) {
			console.log(
				`${id}: no eval results\n${(r.stdout + r.stderr).trim().split('\n').slice(-5).join('\n')}`
			);
			problems++;
			continue;
		}
		// Keyless: grep must still catch every expected failure and skip what should be skipped.
		// A near miss that grep flags is fine: you judge it.
		const bad = results.filter((x) =>
			state.mode === 'keys'
				? !x.ok
				: (x.expected === 'fail' && x.got !== 'fail') || (x.expected === 'skip' && x.got !== 'skip')
		);
		problems += bad.length;
		const nearMisses =
			state.mode === 'keyless'
				? results.filter((x) => x.expected === 'pass' && x.got === 'fail').length
				: 0;
		console.log(
			`${id}: ${results.length - bad.length}/${results.length} ok${nearMisses ? `, ${nearMisses} near miss(es) left for you to judge` : ''}`
		);
		for (const b of bad) console.log(`  ✗ ${b.eval}: expected ${b.expected}, got ${b.got}`);
	}
	fs.rmSync(scratch, { recursive: true, force: true });
	if (dropped.length) console.log(`\nNot checked keyless (no grep stage): ${dropped.join(', ')}`);
	console.log(
		problems
			? `\n${problems} problem(s): fix the Tests, then run evals again.`
			: '\nAll Tests hold. Next: replay.'
	);
	process.exitCode = problems ? 1 : 0;
};

// ---- replay ----

const listPrs = (state, limit, search) => {
	if (state.slug) {
		const r = run(
			'gh',
			[
				'pr',
				'list',
				'-R',
				state.slug,
				'--state',
				'merged',
				'--limit',
				String(limit),
				...(search ? ['--search', search] : []),
				'--json',
				'number,title,url,author,mergeCommit,mergedAt'
			],
			{ cwd: state.repo }
		);
		if (r.status === 0)
			return JSON.parse(r.stdout)
				.filter((p) => p.mergeCommit?.oid)
				.map((p) => ({
					number: p.number,
					title: p.title,
					url: p.url,
					author: p.author?.login ?? 'unknown',
					bot: !!p.author?.is_bot,
					merge: p.mergeCommit.oid,
					mergedAt: p.mergedAt
				}));

		console.error(`gh pr list failed (${r.stderr.trim()}); using first-parent history instead`);
	}
	const log =
		git(
			state.repo,
			'log',
			'--first-parent',
			`-n${limit}`,
			'--format=%H%x09%an%x09%cI%x09%s',
			'HEAD'
		) ?? '';
	return log
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((l) => {
			const [merge, author, mergedAt, title] = l.split('\t');
			return { number: null, title, url: null, author, bot: false, merge, mergedAt };
		});
};

const ensureCommit = (state, oid) => {
	if (
		git(state.repo, 'cat-file', '-e', `${oid}^{commit}`) !== null &&
		git(state.repo, 'cat-file', '-e', `${oid}^1^{commit}`) !== null
	)
		return true;
	git(state.repo, 'fetch', '-q', '--depth=2', 'origin', oid);
	return git(state.repo, 'cat-file', '-e', `${oid}^1^{commit}`) !== null;
};

const whoWrote = (state, pr) => {
	// Bots such as Renovate or a CI bot are not coding agents: only names of known agents count.
	if (AGENT_PATTERN.test(pr.author)) return pr.author.replace(/^app\//, '');
	const body = git(state.repo, 'log', '-1', '--format=%B', pr.merge) ?? '';
	const m = body.match(TRAILER_PATTERN);
	return m ? (m[1] ?? 'claude').toLowerCase() : null;
};

const patterns = (grep) => (grep === undefined ? [] : Array.isArray(grep) ? grep : [grep]);
const regexes = (grep) =>
	patterns(grep).flatMap((p) => {
		try {
			return [new RegExp(p, 'gm')];
		} catch {
			return [];
		}
	});
const countMatches = (res, text) => res.reduce((n, re) => n + (text.match(re) ?? []).length, 0);

/** Line numbers (at the merge commit) of every line the PR added to `file`. */
const addedLines = (state, pr, file) => {
	const diff = git(state.repo, 'diff', '-U0', `${pr.merge}^1`, pr.merge, '--', file) ?? '';
	const added = new Set();
	let line = 0;
	for (const l of diff.split('\n')) {
		const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
		if (h) line = Number(h[1]);
		else if (l.startsWith('+') && !l.startsWith('+++')) added.add(line++);
	}
	return added;
};

/**
 * What the PR added that the assertion's grep matches: each match in the file at the merge commit
 * that touches an added line, shown as those lines. Works for greps that span several lines.
 * Without a grep, the first added lines are shown instead.
 */
const addedMatches = (state, pr, file, res) => {
	const added = addedLines(state, pr, file);
	const text = git(state.repo, 'show', `${pr.merge}:${file}`) ?? '';
	const lines = text.split('\n');
	const show = (nums) =>
		nums.map((n) => ({
			line: n,
			added: added.has(n),
			text: (lines[n - 1] ?? '').trim().slice(0, 240)
		}));
	if (!res.length) return show([...added].slice(0, 12));
	const starts = [0];
	for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
	const lineAt = (offset) => {
		let lo = 0,
			hi = starts.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (starts[mid] <= offset) lo = mid;
			else hi = mid - 1;
		}
		return lo + 1;
	};
	const hits = new Set();
	for (const re of res)
		for (const m of text.matchAll(re)) {
			const first = lineAt(m.index);
			const last = lineAt(m.index + Math.max(m[0].length - 1, 0));
			const range = Array.from({ length: last - first + 1 }, (_, k) => first + k);
			// A long match (a function down to its import) shows its first line and its last three.
			if (range.some((n) => added.has(n)))
				(range.length > 4 ? [range[0], ...range.slice(-3)] : range).forEach((n) => hits.add(n));
			if (m[0].length === 0) re.lastIndex++;
		}

	return show([...hits].sort((a, b) => a - b).slice(0, 12));
};

const parseFindings = (text) => {
	const out = [];
	for (const line of text.split('\n')) {
		const f = line.split(/ {2,}/);
		if (f.length >= 3 && /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(f[1]))
			out.push({
				path: f[0].trim(),
				test: f[1].split('/')[0],
				assertion: f[1].split('/')[1],
				error: f.slice(2).join('  ').trim()
			});
	}
	return out;
};

const replay = async () => {
	const state = loadState();
	const limit = Number(opt('prs', 50));
	snapshotTests(state);
	const { parseTest } = await agentests(state);
	const tests = {};
	for (const id of fs.readdirSync(path.join(state.out, 'tests'))) {
		const f = path.join(state.out, 'tests', id, 'test.yaml');
		if (fs.existsSync(f)) tests[id] = parseTest(fs.readFileSync(f, 'utf8'));
	}
	const search = opt('search');
	const prs = listPrs(state, limit, typeof search === 'string' ? search : undefined);
	if (!prs.length) die('no merged PRs or commits found');
	console.log(
		`Replaying ${prs.length} ${state.slug ? 'merged PRs' : 'commits'} against ${Object.keys(tests).length} Tests (${state.mode})`
	);

	const start = git(state.worktree, 'rev-parse', 'HEAD').trim();
	const results = [];
	const candidates = [];
	let dropped = [];
	for (const [i, pr] of prs.entries()) {
		const label = pr.number ? `#${pr.number}` : pr.merge.slice(0, 8);
		if (!ensureCommit(state, pr.merge)) {
			results.push({
				...pr,
				agent: null,
				status: 'skipped',
				note: 'commit or parent not available locally (shallow clone?)'
			});
			console.log(`${i + 1}/${prs.length} ${label} skipped: commit not available`);
			continue;
		}
		const co = run('git', ['-C', state.worktree, 'checkout', '-q', '-f', '--detach', pr.merge]);
		if (co.status !== 0) {
			results.push({
				...pr,
				agent: null,
				status: 'skipped',
				note: `checkout failed: ${co.stderr.trim()}`
			});
			continue;
		}
		dropped = await installTests(state, state.worktree);
		const t0 = Date.now();
		const r = cli(state, ['run', '--base', `${pr.merge}^1`], state.worktree);
		const secs = (Date.now() - t0) / 1000;
		const output = (r.stdout ?? '') + (r.stderr ?? '');
		const error =
			r.status === 2 || r.error
				? (output.match(/^Error:.*$/m)?.[0] ?? r.error?.message ?? `exit ${r.status}`)
				: null;
		const agent = whoWrote(state, pr);
		let added = 0;
		for (const f of parseFindings(r.stdout ?? '')) {
			const assertion = tests[f.test]?.assert.find((a) => a.id === f.assertion);
			if (!assertion) continue;
			const res = regexes(assertion.grep);
			let kind = 'unclassified';
			let snippets = [];
			if (res.length) {
				const atMerge = countMatches(res, git(state.repo, 'show', `${pr.merge}:${f.path}`) ?? '');
				const atParent = countMatches(
					res,
					git(state.repo, 'show', `${pr.merge}^1:${f.path}`) ?? ''
				);
				kind = atMerge > atParent ? 'new' : 'pre-existing';
				if (kind === 'new') snippets = addedMatches(state, pr, f.path, res);
			} else snippets = addedMatches(state, pr, f.path, []);
			if (kind === 'pre-existing') continue;
			added++;
			candidates.push({
				id: `${label}:${f.path}:${f.test}/${f.assertion}`,
				pr: pr.number,
				merge: pr.merge,
				url: pr.url,
				path: f.path,
				test: f.test,
				assertion: f.assertion,
				rule: tests[f.test].description,
				check: assertion.decide ?? assertion.reason ?? assertion.description,
				error: f.error,
				kind,
				snippets,
				verdict: null,
				note: ''
			});
		}
		results.push({
			...pr,
			agent,
			status: error ? 'error' : 'ok',
			exit: r.status,
			secs,
			error,
			candidates: added
		});
		console.log(
			`${i + 1}/${prs.length} ${label} ${error ? `error: ${error}` : `${added} candidate(s)`} ${secs.toFixed(1)}s${agent ? ` [${agent}]` : ''}`
		);
	}
	run('git', ['-C', state.worktree, 'checkout', '-q', '-f', '--detach', start]);
	// Keep verdicts already given to the same candidates in an earlier replay.
	const previous = path.join(state.out, 'candidates.json');
	if (fs.existsSync(previous)) {
		const judged = new Map(
			readJson(previous)
				.candidates.filter((c) => c.verdict)
				.map((c) => [c.id, c])
		);
		for (const c of candidates) {
			const old = judged.get(c.id);
			if (old) Object.assign(c, { verdict: old.verdict, note: old.note });
		}
	}
	// Put the Tests as written back, so they can be edited and replayed again.
	fs.rmSync(testsIn(state.worktree), { recursive: true, force: true });
	fs.rmSync(path.join(state.worktree, '.agents', INSTALLED), { force: true });
	fs.cpSync(path.join(state.out, 'tests'), testsIn(state.worktree), { recursive: true });
	writeJson(path.join(state.out, 'candidates.json'), {
		slug: state.slug,
		repo: state.repo,
		mode: state.mode,
		replayedAt: new Date().toISOString(),
		tests: Object.values(tests).map((t) => ({
			id: t.id,
			title: t.title,
			description: t.description
		})),
		notCheckedKeyless: dropped,
		prs: results,
		candidates
	});
	const open = candidates.filter((c) => !c.verdict).length;
	console.log(
		`\n${candidates.length} candidate violation(s) added by the PRs, ${open} still to judge. Judge each in ${path.join(state.out, 'candidates.json')} (see SKILL.md, step 6).`
	);
};

// ---- report ----

const report = () => {
	const state = loadState();
	const file = path.join(state.out, 'candidates.json');
	if (!fs.existsSync(file)) die('no candidates.json: run replay first');
	const data = readJson(file);
	const unjudged = data.candidates.filter(
		(c) => c.verdict !== 'violation' && c.verdict !== 'false-alarm'
	);
	if (unjudged.length)
		die(
			`${unjudged.length} candidate(s) still have no verdict ("violation" or "false-alarm"): ${unjudged
				.slice(0, 3)
				.map((c) => c.id)
				.join(', ')}`
		);

	const checked = data.prs.filter((p) => p.status === 'ok');
	const violations = data.candidates.filter((c) => c.verdict === 'violation');
	const byPr = new Map();
	for (const v of violations) byPr.set(v.merge, [...(byPr.get(v.merge) ?? []), v]);
	const broke = checked.filter((p) => byPr.has(p.merge));
	const agentPrs = checked.filter((p) => p.agent);
	const agentBroke = broke.filter((p) => p.agent);
	const falseAlarms = data.candidates.filter((c) => c.verdict === 'false-alarm');
	const alarmsByTest = falseAlarms.reduce(
		(m, c) => m.set(c.test, (m.get(c.test) ?? 0) + 1),
		new Map()
	);
	const prLink = (p) =>
		p.number && data.slug
			? `[#${p.number}](https://github.com/${data.slug}/pull/${p.number})`
			: `\`${p.merge.slice(0, 8)}\``;
	const where = (v) => {
		const s = v.snippets.find((x) => x.added) ?? v.snippets[0];
		return `\`${v.path}${s ? `:${s.line}` : ''}\``;
	};
	const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
	const who = (p) => p.author.replace(/^app\//, '');
	const name = data.slug ?? path.basename(data.repo);

	const lines = [
		`# Rules audit: ${name}`,
		'',
		`**${broke.length} of ${checked.length} merged PRs broke at least one of the repository's own rules, with ${plural(violations.length, 'violation')} in total.**` +
			(agentPrs.length
				? ` ${agentBroke.length} of those ${broke.length} PRs were written by a coding agent (${agentPrs.length} of the ${checked.length} PRs were).`
				: ''),
		'',
		'## Violations',
		''
	];
	if (!broke.length) lines.push('None found.', '');
	else {
		lines.push('| PR | Author | Rule | Where | What |', '| --- | --- | --- | --- | --- |');
		for (const p of broke)
			for (const v of byPr.get(p.merge))
				lines.push(
					`| ${prLink(p)} | ${p.agent ? `${who(p)} (agent)` : who(p)} | ${v.test} | ${where(v)} | ${(v.note || v.error).replace(/\|/g, '\\|')} |`
				);
		lines.push('');
	}
	lines.push(
		'## Rules checked',
		'',
		...data.tests.map((t) => `- **${t.id}**: ${t.description}`),
		'',
		'## How this was checked',
		'',
		`- Each rule was compiled into an [agentests](https://github.com/feuersteiner/agentests) Test and proved on its own eval cases before the replay.`,
		`- Each of the last ${data.prs.length} merged PRs was replayed: the merge commit was checked against its parent, and only violations the PR added count. Violations already in the touched files are left out.`,
		data.mode === 'keyless'
			? '- Keyless mode: grep and glob picked the candidates without calling a model, and the coding agent running the audit judged each one by reading the added lines against the rule.'
			: '- The Tests ran as written, with their model stages; each finding was then confirmed by reading the added lines.',
		`- False alarms: ${falseAlarms.length}${alarmsByTest.size ? ` (${[...alarmsByTest].map(([t, n]) => `${t}: ${n}`).join(', ')})` : ''}. A rule with many false alarms needs a narrower check before it blocks commits.`,
		...(data.notCheckedKeyless?.length
			? [`- Not checked in keyless mode (no grep stage): ${data.notCheckedKeyless.join(', ')}.`]
			: []),
		...(data.prs.length - checked.length
			? [
					`- ${data.prs.length - checked.length} PR(s) could not be checked: ${data.prs
						.filter((p) => p.status !== 'ok')
						.map((p) => `${prLink(p)} (${p.error ?? p.note})`)
						.join('; ')}.`
				]
			: []),
		'- A coding agent judged the candidates. Confirm each violation before sharing this report.',
		'',
		'## Keep these rules from being broken again',
		'',
		`The Tests are in \`${path.join(state.out, 'tests')}\`. To run them on every commit, copy them to \`.agents/tests/\` in the repository and run \`npx agentests init\`.`,
		''
	);
	const reportFile = path.join(state.out, 'AUDIT.md');
	fs.writeFileSync(reportFile, lines.join('\n'));
	console.log(lines.slice(0, 3).join('\n'));
	console.log(`\nReport: ${reportFile}`);
};

// ---- cleanup ----

const cleanup = () => {
	const state = loadState();
	run('git', ['-C', state.repo, 'worktree', 'remove', '--force', state.worktree]);
	console.log(`Removed the worktree. Report and Tests stay in ${state.out}.`);
};

const commands = { setup, evals, replay, report, cleanup };
if (!commands[command]) {
	console.log(
		'Usage: node audit.mjs <setup|evals|replay|report|cleanup> [--out DIR] [--repo .] [--keys] [--prs 50]'
	);
	process.exit(command ? 2 : 0);
}
await commands[command]();
