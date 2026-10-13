# good-vibes

[![CI](https://github.com/subramanian-elavathur/good-vibes/actions/workflows/ci.yml/badge.svg)](https://github.com/subramanian-elavathur/good-vibes/actions/workflows/ci.yml) [![npm-version](https://img.shields.io/npm/v/good-vibes?color=blue)](https://www.npmjs.com/package/good-vibes) [![license](https://img.shields.io/npm/l/good-vibes)](./LICENSE)

Good Vibes is a simple Node.js testing library designed to make writing and executing tests easy and fun.

It was inspired by, and written primarily while listening to, [Alicia Keys' Tiny Desk Concert](https://www.youtube.com/watch?v=uwUt1fVLb3E)

## Installation

```bash
npm install --save-dev good-vibes
```

Good Vibes requires Node.js 24 (LTS) or later. It works with ES modules (`import`) and CommonJS (`require`), runs TypeScript test files directly and ships with its type declarations.

## Getting started

Lets say you wanted to test the following function defined in `src/code.js`

```javascript
// defined in ./src/code.js
export const codeToTest = (firstName, lastName, age) => {
  return {
    name: {
      first: firstName,
      last: lastName,
    },
    age: age,
  };
};
```

Here is how you would write a test using good-vibes for this function

```javascript
// defined in ./test/code.test.js
import assert from "node:assert/strict";
import { test } from "good-vibes";
import { codeToTest } from "../src/code.js";

test("My first test", () => {
  const expected = {
    name: { first: "Hello", last: "World" },
    age: 999,
  };
  assert.deepEqual(codeToTest("Hello", "World", 999), expected);
});
```

To run your tests add a script to your `package.json` file

```json
{
  "name": "my-library",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "test": "good-vibes \"test/**/*.test.js\""
  }
}
```

And then on command line type

```bash
npm test
```

The `good-vibes` command finds every file matching the pattern and runs its tests. It exits with return code `0` when all tests pass, and `1` when any test fails.

## Writing tests

### `test`

The `test` function registers a test. It has the following signature:

```javascript
test("name", testFunction, groupNameOrOptions);
```

- `name`: name of your test
- `testFunction`: the test itself, see below
- `groupNameOrOptions`: optional, either the name of the group the test belongs to (see `Grouping tests`), or an object with these options:
  - `group`: name of the group
  - `timeout`: timeout in milliseconds, see `Timeouts`
  - `skip`: `true` or a reason to skip the test
  - `only`: `true` to only run the tests marked with `only` in this file, see `Debugging`

### When a test finishes

A test fails if it throws an error, or if a promise it returns rejects. It is complete:

1. when the promise it returns settles, for example once an `async` test finishes:

   ```javascript
   test("Async test", async () => {
     const greeting = await sayGreeting("World!");
     assert.equal(greeting, "Hello, World!");
   });
   ```

2. when it returns, if it does not take the `context` parameter:

   ```javascript
   test("Sync test", () => {
     assert.throws(() => JSON.parse("{"), SyntaxError);
   });
   ```

3. when it calls `context.done()`. This is only needed for tests that take the context and are not `async`, typically because they finish in a callback:

   ```javascript
   test("Callback test", (context) => {
     setTimeout(() => {
       context.check(true, true);
       context.done();
     }, 2000);
   });
   ```

### Assertions

Any error thrown inside a test fails it, so you can use [`node:assert`](https://nodejs.org/api/assert.html), or any other assertion library. Its message and diff are printed in the logs:

```text
Log: deep: AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
+ actual - expected

  {
    a: 1,
    b: [
      1,
+     2
-     3
    ]
  }
```

Tests also receive a `context` with assertions of its own. A failed assertion is logged and fails the test, but the test keeps running so you see every failure at once:

1. `check(expected, actual)`: checks that the values are deeply and strictly equal, with the same rules as [`assert.deepStrictEqual`](https://nodejs.org/api/assert.html#assertdeepstrictequalactual-expected-message). For example `{ a: undefined }` is not equal to `{}`.
2. `throws(fn, expectedMessage)`: checks that `fn` throws. `expectedMessage` is optional: a string must equal the error message, a regular expression must match it.
3. `rejects(promise, expectedMessage)`: checks that the promise (or the promise returned by calling it) rejects, works like `throws`. It is asynchronous, so `await` it.
4. `snapshot(name, actual, rebase)`: compares a value with a stored baseline, see `Snapshot Testing`.
5. `log(message)`: logs a message prefixed with the test name to make it easier to find in the logs.
6. `done()`: marks the test as complete, see above.

`check` and `throws` return the context, so they can be chained:

```javascript
test("Context assertions", async (context) => {
  context
    .check({ name: "Alicia" }, await getSinger())
    .throws(() => getSinger(-1), "Invalid id -1");
  await context.rejects(fetchSinger("missing"), /not found/);
});
```

## Grouping tests

Groups put related tests together, and let them share setup and teardown with `before` and `after`. Tests without a group belong to the `Default` group.

1. Tests in a group run one after another, in the order they are declared, so later tests can build on what earlier tests did. Call `concurrent` to run them at the same time instead.
2. Groups run one after another, in the order they are declared.

### Example

```javascript
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { group } from "good-vibes";

const { before, test, after } = group("Files");

let directory;

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "my-tests-"));
});

test("write", async () => {
  await writeFile(path.join(directory, "song.txt"), "Fallin'");
});

test("read", async () => {
  assert.equal(
    await readFile(path.join(directory, "song.txt"), "utf8"),
    "Fallin'",
  );
});

after(() => rm(directory, { recursive: true }));
```

### `group`

`group(name)` returns `before`, `test`, `after`, `group` and `concurrent`, bound to that group:

```javascript
const songs = group("Songs");

songs.before(setUp);
songs.test("Fallin'", testFunction);
songs.after(tearDown);
songs.concurrent(); // run the tests in this group at the same time
```

### `before` and `after`

`before` runs once before the tests in a group, and `after` runs once they finished, even if some failed. They finish the same way tests do: when their promise settles, when they return (if they do not take the `context` parameter) or when they call `context.done()`. Their context only has `log` and `done`.

```javascript
before(scriptFunction, groupNameOrOptions); // groupName defaults to 'Default' group
after(scriptFunction, groupNameOrOptions);
```

`groupNameOrOptions` is a group name or an object with `group` and `timeout` options.

If `before` fails, the tests in its group are skipped and reported as failed, and `after` still runs so you can clean up. If `after` fails, the test run fails.

### Nested groups

`group(...).group(name)` creates a nested group. It runs where it is declared among the tests of its parent: after the parent's `before`, and before its `after`.

```javascript
const songs = group("Songs");
songs.before(openDatabase);
songs.test("first", testFunction);

const ballads = songs.group("Ballads"); // reported as "Songs › Ballads"
ballads.before(addBallads);
ballads.test("If I Ain't Got You", testFunction);

songs.test("runs after the Ballads group", testFunction);
songs.after(closeDatabase);
```

## The `good-vibes` command

```text
Usage: good-vibes [options] [patterns...]

Runs the test files matching the glob patterns, each in its own process.
A directory runs the test files in it. Patterns default to "**/*.test.{js,mjs,cjs,ts,mts,cts}".
node_modules directories are never searched.

Options:
  --timeout <ms>         Timeout for each test, before and after script
                         (default: 30000, 0 disables it)
  --concurrency <n>      Number of test files to run at the same time
                         (default: number of CPUs minus one)
  --grep <pattern>       Only run tests whose name, or the name of one of
                         their groups, matches the regular expression
  --snapshots-dir <dir>  Directory of snapshot baselines
                         (default: test/__snapshots__)
  -h, --help             Show this help
  -v, --version          Show the version number

Examples:
  good-vibes "test/**/*.test.ts"
  good-vibes --timeout 5000 test/users.test.ts
```

Quote glob patterns so they are expanded by good-vibes rather than your shell. Only files matching the patterns run as test files, so helper modules (such as `test/helpers.ts`) can live next to them.

Each test file runs in its own process, so files do not share state, and several files run at the same time. The output of each file is printed once it finishes, so it does not get mixed up.

The command exits with return code `1` if any test, `before` or `after` script fails, if a test file fails to load, or if no tests are found. At the end it prints a summary that lists every failure with its file, group and test name:

```text
Ran 57 tests from 6 files in 3.08 seconds

Hey 1/57 tests failed, but its going to be ok. Start by going through the list below and adding some logs to figure out whats going wrong:
1. test/simple.test.ts › simple partition › get (Expected values to be strictly equal:)
```

## Timeouts

Every test, `before` and `after` script has to finish within 30 seconds, otherwise it fails and the next test runs. Change the default with the `--timeout` option of the command (in milliseconds, `0` disables it), or for one test or script with its `timeout` option:

```javascript
test("Slow test", slowTest, { timeout: 60_000 });
before(slowSetup, { group: "Database", timeout: 60_000 });
```

## TypeScript

Test files can be written in TypeScript and run directly, as Node.js strips the types (use `.ts` in an ES module package, or `.mts`):

```json
{
  "type": "module",
  "scripts": {
    "test": "good-vibes \"test/**/*.test.ts\""
  }
}
```

good-vibes is written in TypeScript and ships with its type declarations, no `@types` package is needed. Every type is exported from `good-vibes`:

```typescript
import assert from "node:assert/strict";
import { group, type TestContext } from "good-vibes";
import { Playlist } from "../src/playlist.ts";

const expectLength = (
  context: TestContext,
  playlist: Playlist,
  length: number,
) => context.check(length, playlist.songs.length);

const playlists = group("Playlist");
let playlist: Playlist;

playlists.before(() => {
  playlist = new Playlist();
});

playlists.test("add", async () => {
  await playlist.add("Fallin'");
  assert.deepEqual(playlist.songs, ["Fallin'"]);
});

playlists.test("length", (context) => {
  expectLength(context, playlist, 1).done();
});
```

The types work with [typescript-eslint](https://typescript-eslint.io)'s type checked rules: registering tests and scripts returns `void`, and they accept `async` functions.

## Snapshot Testing

Sometimes the output of a function can be very large - making it cumbersome to test using the `context.check` api. To help with this good-vibes supports snapshot testing.

Snapshot tests allow you test for changes in the expected output. They do this by maintaining a `baseline` file with the expected output. Then whenever you run your test the actual output is compared against this baseline file and if they don't match the differences are reported as shown below:

```text
Log: Kun Faya Kun: Snapshot Rockstar: FAILED, see diff below (- baseline, + actual)
  {
    "bool": false,
    "date": "1990-07-18",
    "enum": "json",
    "random": 5,
-   "random float": 69.768,
-   "regEx": "hellooo world"
+   "random float": 69.767,
+   "regEx": "helloooooooooooooooo world"
  }
Log: Kun Faya Kun: 0/1 Assertions PASSED
Finished: Kun Faya Kun [FAILED in 0.006 seconds]
```

### Simple Example

```javascript
import { group } from "good-vibes";

const { test } = group("Snapshots");

const createLargeObject = (value) => ({
  a: value,
  b: 123,
  c: true,
  d: [1, 2, 3, 4, 5],
  e: {
    f: [
      {
        a: value,
        b: 123,
        c: true,
        d: [1, 2, 3, 4, 5],
      },
    ],
  },
});

test("Large Object", async (ctx) => {
  // snapshot verifications are asynchronous so you must await its execution
  await ctx.snapshot("Check 1", createLargeObject("One"));
  // A single test may have one or more snapshot assertions, each snapshot inside a test must have a unique name
  await ctx.snapshot("Check 2", createLargeObject("Two"));
});
```

In the above example `good-vibes` will check if the output of `createLargeObject` matches the snapshot with name `Check 1` and `Check 2` respectively.

Notes:

1. Snapshots internally use `JSON.stringify` to write the snapshot files, so please be careful while creating snapshots of objects with functions in them
2. Order of keys in the object does not matter as the verification is performed on the parsed JSON object and not the json string itself

### Snapshot API

The `snapshot` function has the following signature:

```typescript
async snapshot<Type>(snapshotName: string, actualValue: Type, rebase?: boolean): Promise<TestContext>
```

### Creating or updating a baseline

The first time you run the snapshot test it will fail stating that the baseline file could not be found, similar to this:

```text
Log: Large Object: Snapshot Check 1: FAILED as the baseline at test/__snapshots__/Snapshots/Large Object_Check 1.json could not be read (ENOENT: no such file or directory, open 'test/__snapshots__/Snapshots/Large Object_Check 1.json'). Set the rebase flag to true to create it
```

To create a new baseline or update an existing one, set the third argument of the `snapshot` api to `true`. Baselines are written as formatted JSON so changes to them are easy to review.

**Important Note:** When you rebase a snapshot file, good-vibes will automatically **fail** that test. This is to safeguard against accidental updates to snapshot files and prevent this flag from being committed into source control

### Snapshots directory and file structure

#### Directory Structure

By default good-vibes will create a directory to store all snapshots at this location: `./test/__snapshots__` (relative to the directory you run your tests from). Inside this folder a new folder is created for each `group` of tests.

You may change this directory with the `--snapshots-dir` option of the `good-vibes` command.

#### Snapshot file naming convention

All snapshot files are named using the following convention: `<test-name>_<snapshot-name>.json`

#### Overall Structure

Putting the above conventions together, the following template specifies the exact location (using defaults): `./test/__snapshots__/<group-name>/<test-name>_<snapshot-name>.json`

In case of our example tests above, following would be the snapshot paths:

`./test/__snapshots__/Snapshots/Large Object_Check 1.json`

`./test/__snapshots__/Snapshots/Large Object_Check 2.json`

#### Example

![Snapshot directory structure](/docs/images/snapshot-directory-structure.png "Snapshot directory structure")

## Debugging

When you have too many tests in your application, its often useful to be able to run just one or a few failing tests alone to debug the cause of their failure. good-vibes supports three ways to do this:

1. The `--grep` option of the `good-vibes` command runs the tests whose name, or the name of one of their groups, matches a regular expression:

   ```bash
   npx good-vibes --grep "Songs" "test/**/*.test.ts"
   ```

2. The `only` option runs only the tests marked with it in a file. Their groups' `before` and `after` scripts still run:

   ```javascript
   test("If I Ain't Got You", testFunction, { only: true });
   ```

3. The `Debug` group runs only the tests in that group, in a file.

**Important Note**: When `only` or the `Debug` group is used, good-vibes exits with failure return code 1 - this is to prevent them from being accidentally committed to source control. The following disclaimer will also be printed in the logs:

![Debug mode disclaimer](/docs/images/debug-mode.png "Debug mode disclaimer")

### Using the `Debug` group

We recommend that you `import { DEBUG } from "good-vibes"` instead of redefining the variable yourself. This will isolate your tests from changes to this group name in the future.

```javascript
import { before, test, DEBUG } from "good-vibes";

// When running in debug mode only tests tagged with DEBUG group are run,
// all other tests are skipped

before((ctx) => {
  ctx.log("You can run before and after blocks even in debug mode");
  ctx.done();
}, DEBUG);

test(
  "Johnny Cash",
  (ctx) => {
    ctx.log("Hurt");
    ctx.check(1, 1).done();
  },
  DEBUG,
);
```

### Debugging nodejs programs in your IDE

[Instructions for VS Code](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)

## Code Coverage

Code coverage reports can be generated using [`c8`](https://github.com/bcoe/c8), which uses the code coverage built into Node.js. It includes test files that good-vibes runs in their own processes.

First install `c8` as a dev dependency

```bash
npm install --save-dev c8
```

Next update your `package.json` scripts section to add a coverage script to run `c8`

```json
{
  "scripts": {
    "test": "good-vibes \"test/**/*.test.ts\"",
    "coverage": "c8 --include \"src/**\" --reporter=html --reporter=text-summary good-vibes \"test/**/*.test.ts\""
  }
}
```

The above configuration prints a text summary and writes a detailed html report to the `/coverage` folder:

![Coverage Text Summary](/docs/images/text-summary.png "Coverage Text Summary")

![Coverage HTML report](/docs/images/lcov-html.png "Coverage HTML report")

## Output colors

When the output is a terminal, passing tests are printed in green and failing ones in red. There are no colors when the output is redirected to a file or another program, for example in CI. Set the [`NO_COLOR`](https://no-color.org) environment variable to turn colors off, or `FORCE_COLOR=1` to turn them on.

## Running tests without the command

Instead of the `good-vibes` command, a script can import its test files and call `run()`, then run it with `node`:

```javascript
// defined in ./test/index.js
import run from "good-vibes";
import "./users.test.js";
import "./orders.test.js";

run();
```

All files then run in the same process. `run()` exits the process once the tests finish. It accepts these options, shown with their default values:

```javascript
run({
  timeout: 300_000, // milliseconds all tests have to finish
  testTimeout: 30_000, // milliseconds each test, before and after script has to finish
  snapshotsDirectory: "test/__snapshots__",
  returnCodeOnFailure: 1,
  reportTestResults: false, // write a TAP report for each group of tests
  testResultsDirectory: "test-results",
  executionTimePrecision: 3, // decimal places of execution times
  grep: undefined, // only run tests whose name, or group name, matches
});
```

The `good-vibes` command ignores calls to `run()`, so test files written this way can also be run with the command.

### Test Reports

With `reportTestResults` set to `true`, `run()` writes a [TAP version 13](https://testanything.org/tap-version-13-specification.html) report for each group of tests to the `test-results` directory (configurable with `testResultsDirectory`), which most CI systems can display. A group named `My Group` produces `test-results/my-group.tap`:

```text
TAP version 13
1..3
ok 1 My Test
not ok 2 My Other Test
  ---
  message: "Something went wrong"
  ...
ok 3 Later # SKIP not yet
```

## Upgrading from good-vibes 1.x

1. Replace the file that imports every test file and calls `run()` with the `good-vibes` command, for example `"test": "good-vibes \"test/**/*.test.js\""`. Calls to `run()` in your test files are ignored by the command, so you can remove them at your own pace.
2. Tests in a group now run one after another by default. Call `concurrent()` on a group to run its tests at the same time; `sync()` is no longer needed.
3. `async` tests and scripts no longer need to call `done()`, nor do tests and scripts that do not take the `context` parameter.
4. `check` now uses strict equality, like `assert.deepStrictEqual`. For example `{ a: undefined }` no longer equals `{}`, and `1` no longer equals `new Number(1)`.
5. Import types from `good-vibes` instead of files inside the package, e.g. `import type { TestContext } from "good-vibes"`.
6. Tests and scripts time out after 30 seconds by default.

See the [changelog](./CHANGELOG.md) for everything that changed.

## Examples

Runnable examples live in the [examples](./examples) directory, run them with `npm run examples`:

- Simple tests can be found in [examples/simple.test.mjs](./examples/simple.test.mjs)
- Test grouping with use of `before` and `after` can be found in [examples/groups.test.mjs](./examples/groups.test.mjs)
- A concise example of groups and nested groups using the `group` api can be found in [examples/concise-groups.test.mjs](./examples/concise-groups.test.mjs)
- The order tests run in, and `concurrent` groups, can be found in [examples/order.test.mjs](./examples/order.test.mjs)
- `node:assert` and the assertions of the test context can be found in [examples/assertions.test.mjs](./examples/assertions.test.mjs)
- Example of `snapshot` tests can be found in [examples/snapshot.test.mjs](./examples/snapshot.test.mjs)
- A TypeScript test file can be found in [examples/typescript.test.mts](./examples/typescript.test.mts)
- Examples of failing tests can be found in [examples/failures/failing.test.mjs](./examples/failures/failing.test.mjs)
- Example of how `debug` mode works can be found in [examples/failures/debug.test.mjs](./examples/failures/debug.test.mjs)

## Development

You will need Node.js 24 or later (the version in [`.nvmrc`](./.nvmrc), run `nvm use` to switch to it).

```bash
npm install            # install dependencies and git hooks
npm test               # build and run the test suite
npm run coverage       # run the test suite with code coverage
npm run lint           # check code style with ESLint and Prettier
npm run typecheck      # type check the library, tests and examples
npm run lint:package   # check the package with publint and @arethetypeswrong/cli
npm run test:consumer  # check the packed package works in a project like glitch-db
npm run format         # fix formatting
npm run examples       # build and run the examples
```

The test suite uses the [Node.js test runner](https://nodejs.org/api/test.html). Because good-vibes exits the process once its tests finish, each test runs the `good-vibes` command or a script from [test/fixtures](./test/fixtures) in a child process and checks its output, return code and the files it writes.

[`test/consumer`](./test/consumer) contains a project set up like [glitch-db](https://github.com/subramanian-elavathur/glitch-db): an ES module package with TypeScript tests that Node.js runs directly, type checked with `tsc`, linted with typescript-eslint's type checked rules and covered with `c8`. `npm run test:consumer` installs the packed package there and checks all of that works.

To publish a new version, update the version in `package.json` and [CHANGELOG.md](./CHANGELOG.md), then create a GitHub release. The release workflow tests and publishes the package.
