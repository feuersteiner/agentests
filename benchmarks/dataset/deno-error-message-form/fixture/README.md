# datetime-utils

Small date, time and duration helpers shared by the Larkspur scheduling services. It has no
dependencies and runs on Bun.

## Modules

| Module            | Exports                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| `src/parse.ts`    | `parseDate(input)` for `YYYY-MM-DD`, `parseTime(input)` for `HH:MM`            |
| `src/duration.ts` | `parseDuration(input)` for `250ms`, `90s`, `5m`, `1.5h` or `2d`, and `UNIT_MS` |
| `src/format.ts`   | `formatDuration(ms, digits)`, `formatDate(date)`                               |

Everything is exported from `src/index.ts`.

## Usage

```ts
import { formatDuration, parseDate, parseDuration } from 'datetime-utils';

const start = parseDate('2024-11-23');
const timeout = parseDuration('90s'); // 90000
```

## Development

```sh
bun test
```
