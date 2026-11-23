# relay-kit

Small runtime pieces shared by the Relay team's background services. Everything runs on
[Bun](https://bun.sh) and has no dependencies.

| Module            | What it does                                                               |
| ----------------- | -------------------------------------------------------------------------- |
| `src/watcher.ts`  | Watches files by polling and emits a `change` event when one is modified.  |
| `src/queue.ts`    | Runs jobs one at a time and emits `drained` when the last one has finished. |
| `src/server.ts`   | HTTP server whose `stop()` lets in-flight requests finish first.           |
| `src/cache.ts`    | Cache that serves an expired entry while it refreshes it in the background. |
| `src/duration.ts` | Parses durations such as `250ms`, `5s` and `2m` into milliseconds.         |

## Usage

```ts
import { createServer } from './src/server.ts';
import { FileWatcher } from './src/watcher.ts';

const server = createServer(() => new Response('ok'));
console.log(`listening on ${server.url}`);

const watcher = new FileWatcher({ interval: 50 });
watcher.on('change', async ({ path }) => {
	console.log(`${path} changed, shutting down`);
	watcher.close();
	await server.close();
});
watcher.watch('relay.config.json');
```

## Development

```sh
bun test
```

The tests live in `test/`, one file per module, with shared helpers in `test/helpers.ts`.
Notable changes go in `CHANGELOG.md`, under `Unreleased`.
