# spanwise

Parse and format human-readable time spans, with no dependencies.

```js
import { format, parse } from 'spanwise';

format(5_400_000); // "1h 30m"
format(90_061_000, { largest: 2 }); // "1d 1h"
format(1_250, { ms: true }); // "1s 250ms"
parse('1h 30m'); // 5400000
```

The units are `d`, `h`, `m`, `s` and `ms`. `parse` takes parts separated by spaces.

## Development

Node 22 or later. There is nothing to install beyond Node itself.

- `npm test` runs the tests; `npm run coverage` also writes `lcov.info`.
- `npm run lint` checks the JavaScript files, or only the ones you name:
  `npm run lint -- src/index.js`.
- `npm run bench` prints a Markdown table of operations per second.
- `npm run build:site` builds the docs site from this README into `site/dist/`.

## CI

`.github/workflows/ci.yml` runs on every push to main and every pull request: the linter, the
tests with coverage uploaded to Codecov, and a build of the docs site. Pushes to main also deploy
the site to Netlify, at https://spanwise.netlify.app.

`NETLIFY_TOKEN` (a Netlify personal access token) and `CODECOV_TOKEN` (the Codecov upload token)
are repository secrets. The Netlify site id is the repository variable `NETLIFY_SITE_ID`.

Pull requests from forks are welcome.
