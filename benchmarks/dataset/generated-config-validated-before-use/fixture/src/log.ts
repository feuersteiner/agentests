type Level = 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

/** Writes one JSON line: info to stdout, warnings and errors to stderr. Silent under `bun test`. */
function write(level: Level, message: string, fields: Fields = {}): void {
	if (process.env.NODE_ENV === 'test') return;
	const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
	(level === 'info' ? process.stdout : process.stderr).write(line + '\n');
}

export const log = {
	info: (message: string, fields?: Fields) => write('info', message, fields),
	warn: (message: string, fields?: Fields) => write('warn', message, fields),
	error: (message: string, fields?: Fields) => write('error', message, fields)
};
