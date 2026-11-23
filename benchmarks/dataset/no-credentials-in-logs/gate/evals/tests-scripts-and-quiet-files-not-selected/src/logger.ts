/** The log levels, from the most verbose to the least. */
export const LEVELS = ['trace', 'debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LEVELS)[number];

/** The structured fields of one log line. */
export type Fields = Record<string, unknown>;

type LogMethod = (fields: Fields, msg: string) => void;

export interface Logger {
	trace: LogMethod;
	debug: LogMethod;
	info: LogMethod;
	warn: LogMethod;
	error: LogMethod;
	/** A logger that adds `bindings` to every line it writes. */
	child(bindings: Fields): Logger;
}

export function isLogLevel(value: string): value is LogLevel {
	return (LEVELS as readonly string[]).includes(value);
}

/** Writes an Error as pino's err serializer does: its type, message and stack, then its own fields. */
function serializeError(error: Error): Fields {
	return { type: error.name, message: error.message, stack: error.stack, ...error };
}

function replacer(_key: string, value: unknown): unknown {
	return value instanceof Error ? serializeError(value) : value;
}

/**
 * A small JSON-lines logger with pino's call shape: the fields first, then the message. Each line holds the level,
 * the time, the bindings, the fields and the message. Lines below `level` are dropped.
 */
export function createLogger(
	level: LogLevel,
	write: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
	bindings: Fields = {}
): Logger {
	const threshold = LEVELS.indexOf(level);
	const method =
		(name: LogLevel): LogMethod =>
		(fields, msg) => {
			if (LEVELS.indexOf(name) < threshold) return;
			const line = { level: name, time: new Date().toISOString(), ...bindings, ...fields, msg };
			write(JSON.stringify(line, replacer));
		};
	return {
		trace: method('trace'),
		debug: method('debug'),
		info: method('info'),
		warn: method('warn'),
		error: method('error'),
		child: (more) => createLogger(level, write, { ...bindings, ...more })
	};
}
