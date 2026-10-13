# Changelog

## 2.0.0 (unreleased)

### Highlights

- **The `good-vibes` command** finds test files with glob patterns and runs each in its own process, several at a time: `good-vibes "test/**/*.test.ts"`. No more file that imports every test file and calls `run()`. Options: `--timeout`, `--concurrency`, `--grep` and `--snapshots-dir`.
- **No more `done()`** for `async` tests and scripts, which finish when their promise settles, nor for tests and scripts that do not take the context parameter, which finish when they return. `done()` still works.
- **Use any assertion library**: errors thrown by tests fail them, including `node:assert`, whose message and diff are printed.
- **TypeScript test files run directly** with Node.js' type stripping, and every type is exported from `good-vibes`.
- **Native ES modules**: `import { test } from "good-vibes"` works without a bundler, and `import` and `require` share the same tests.

### Breaking changes

- Requires Node.js 24 (LTS) or later.
- Tests in a group run one after another, in declaration order, by default. Call `concurrent()` to run them at the same time; `sync()` is deprecated as it is now the default.
- `check` uses strict deep equality (like `assert.deepStrictEqual`) instead of lodash's `isEqual`. For example `{ a: undefined }` no longer equals `{}`.
- Tests, `before` and `after` scripts time out after 30 seconds by default (`--timeout`, the `testTimeout` option of `run()`, or the `timeout` option of a test or script).
- A test that does not take the context parameter finishes when it returns. Tests that take the context and are not `async` still need to call `done()`.
- When a `before` script fails, the tests in its group are skipped and reported as failed (previously the failure was silently ignored and the tests ran anyway). When an `after` script fails, the run fails.
- `run()` fails when no tests are registered. The summary lists failures as `group › test` (prefixed with the file when using the command) instead of `[group] test`.
- There are no colors when stdout is not a terminal. `NO_COLOR` turns them off and `FORCE_COLOR` turns them on.
- `executionTimePrecision` now sets the number of decimal places used to print execution times, as documented. Previously it divided the time in milliseconds by 10 to the power of the precision, so any value other than 3 printed wrong times.
- The package has an `exports` map. Only `good-vibes` and `good-vibes/package.json` can be imported; deep imports such as `good-vibes/lib/src/index.js` or `good-vibes/typings/Context` no longer work, import the types from `good-vibes` instead.
- Failed assertions print values using `util.inspect` instead of `JSON.stringify`, e.g. strings are shown as `'text'` instead of `"text"`.
- Snapshot baselines are written as formatted JSON, and snapshot diffs prefix lines with `-` (baseline) and `+` (actual) so they can be read without colors. Existing baselines keep working.

### Features

- Nested groups: `group("Parent").group("Child")`. A nested group runs where it is declared among its parent's tests, between the parent's `before` and `after` scripts.
- `skip` and `only` options for tests, and the `--grep` option (or `grep` option of `run()`) to run tests by name or group name. Like the `Debug` group, runs using `only` exit with return code 1 so they are not committed by mistake.
- `context.throws(fn, expectedMessage)` and `context.rejects(promise, expectedMessage)` assertions.
- Errors thrown outside of the promise chain of a test (e.g. in a timer) or unhandled promise rejections fail the running test instead of crashing the run.
- Timed out tests and scripts are reported with the time limit, and the global timeout lists the tests that did not finish.
- The summary shows why each test failed, including the first failed assertion of the test context.
- Types for `Group`, `TestOptions`, `HookOptions`, `Options`, `TestResult`, `TestContext`, `Context`, `TestFunction`, `HookFunction` and `ExpectedMessage` are exported, and work with typescript-eslint's type checked rules.
- `run` is also a named export, so `const { run, test } = require("good-vibes")` works.
- TAP reports mark skipped tests, escape `#` in test names, include the error message of failed tests and end with a newline.

### Fixes

- An `async` test, `before` or `after` script that throws no longer crashes the whole run with an unhandled rejection.
- Snapshot baselines that are not valid JSON fail the test instead of crashing the run.
- Assertions on values `JSON.stringify` cannot handle (such as `BigInt` or circular objects) no longer throw when they fail.
- The global timeout message no longer prints `NaN seconds` when the default timeout is used.
- The assertion number in failure messages counts all assertions, not just failed ones.
- Output is flushed before the process exits.

### Maintenance

- Dependencies: dropped `lodash.isequal` (deprecated), upgraded `diff` to v9. `npm audit` reports no vulnerabilities.
- Upgraded to TypeScript 6, ESLint 10 (flat config with type-aware rules), Prettier 3, husky 9 and lint-staged 17.
- Removed Codecov and replaced `nyc` with `c8`. Coverage is printed in the CI logs.
- New test suite using the Node.js test runner that checks return codes, output, snapshots and reports; the previous suite always exited with return code 0.
- A consumer check (`npm run test:consumer`) installs the packed package in a project set up like glitch-db and checks type checking, linting, the command and coverage work there.
- Examples moved to the `examples` directory and run with the `good-vibes` command.
- CI runs on Node.js 24 and 26 and checks the package with `publint` and `@arethetypeswrong/cli`; releases are published with npm trusted publishing and provenance. Code scanning uses CodeQL's default setup.
