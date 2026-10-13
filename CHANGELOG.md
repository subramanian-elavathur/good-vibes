# Changelog

## 2.0.0 (unreleased)

### Breaking changes

- Requires Node.js 22 or later (Node.js 16, 18 and 20 have reached end of life).
- The package now has an `exports` map. Only `good-vibes` and `good-vibes/package.json` can be imported; deep imports such as `good-vibes/lib/src/index.js` no longer work.
- Build output moved from `lib/src` and `typings/src` to `lib`.
- `executionTimePrecision` now sets the number of decimal places used to print execution times, as documented. Previously it divided the time in milliseconds by 10 to the power of the precision, so any value other than 3 printed wrong times.
- When a `before` script fails, the tests in its group are now skipped and reported as failed (previously the failure was silently ignored and the tests ran anyway). When an `after` script fails, the run now fails.
- Failed assertions print values using `util.inspect` instead of `JSON.stringify`, e.g. strings are shown as `'text'` instead of `"text"`.
- Snapshot baselines are written as formatted JSON, and snapshot diffs prefix lines with `-` (baseline) and `+` (actual) so they can be read without colors. Existing baselines keep working.

### Fixes

- A test, `before` or `after` script that is an `async` function and throws (or returns a rejected promise) now fails instead of crashing the whole run with an unhandled rejection.
- Snapshot baselines that are not valid JSON fail the test instead of crashing the run.
- Assertions on values `JSON.stringify` cannot handle (such as `BigInt` or circular objects) no longer throw when they fail.
- The global timeout message no longer prints `NaN seconds` when the default timeout is used, and it now lists the tests that did not finish.
- The assertion number in failure messages counts all assertions, not just failed ones.
- TAP reports escape `#` in test names, include the error message of failed tests and end with a newline.

### Features

- Native ES module support: `import run, { test } from "good-vibes"` now works in Node.js without a bundler or TypeScript. `import` and `require` share the same tests, so they can be mixed.
- `run` is also available as a named export, so `const { run, test } = require("good-vibes")` works.
- TypeScript types for `Options`, `TestResult`, `TestContext`, `Context`, `TestFunction` and `HookFunction` are exported.
- Colors can be turned off with the `NO_COLOR` environment variable.
- Execution times are measured with `performance.now()`.

### Maintenance

- Replaced the deprecated `lodash.isequal` package with `lodash` (same comparison) and upgraded `diff` to v9.
- Upgraded to TypeScript 6, ESLint 10 (flat config with type-aware rules), Prettier 3, husky 9 and lint-staged 16. `npm audit` now reports no vulnerabilities.
- Replaced the deprecated `codecov` uploader with the Codecov GitHub Action and `nyc` with `c8`.
- New test suite using the Node.js test runner that checks return codes, output, snapshots and reports; the previous suite always exited with return code 0.
- Examples moved to the `examples` directory.
- CI runs on Node.js 22, 24 and 26 and checks the published types with `@arethetypeswrong/cli`; releases are published with npm provenance.
