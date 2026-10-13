// Checks the public API the way test files use it, with `npm run typecheck`
// and `npm run lint` (typescript-eslint's recommendedTypeChecked rules). This
// file is never executed.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import run, {
  after,
  before,
  concurrent,
  DEBUG,
  group,
  test,
  type Context,
  type Group,
  type HookFunction,
  type Options,
  type TestContext,
  type TestFunction,
  type TestResult,
} from "good-vibes";

let directory = "";

// Registering returns void (no-floating-promises) and accepts async functions
// (no-misused-promises)
before(async () => {
  directory = await mkdtemp("good-vibes-");
});
after(() => rm(directory, { recursive: true }));
test("async", async () => {
  assert.equal(await Promise.resolve(1), 1);
});
test("sync", () => {
  assert.ok(directory);
});
test("context", async (ctx) => {
  ctx.check({ a: 1 }, { a: 1 }).throws(() => JSON.parse("{"), /JSON/);
  await ctx.rejects(Promise.reject(new Error("no")), "no");
  ctx.log(ctx.name);
});
test("options", () => undefined, { timeout: 1000, skip: "reason" });
test("debug", () => undefined, DEBUG);
concurrent("Default");

// Destructuring the group api does not trip unbound-method
const {
  before: setUp,
  test: groupTest,
  after: tearDown,
}: Group = group("Group");
setUp(
  (ctx: Context) => {
    ctx.done();
  },
  { timeout: 100 },
);
groupTest("callback", (ctx) => {
  setTimeout(() => ctx.done(), 1);
});
tearDown(async () => {
  await rm(directory, { recursive: true });
});
group("Group")
  .group("Nested")
  .test("nested", () => undefined);

// Callbacks may return anything
export const returnsTimer: TestFunction = (ctx) =>
  setTimeout(() => ctx.done(), 1);
export const returnsPromise: HookFunction = () => Promise.resolve(5);

export const assertGreeting = (ctx: TestContext, actual: string): TestContext =>
  ctx.check("Hello, World!", actual);

export const options: Options = {
  timeout: 1000,
  testTimeout: 100,
  snapshotsDirectory: "snapshots",
  returnCodeOnFailure: 2,
  reportTestResults: true,
  testResultsDirectory: "reports",
  executionTimePrecision: 2,
  grep: /name/,
};

export const result: TestResult = {
  name: "test",
  group: "Default",
  status: true,
  skipped: false,
  file: "test/a.test.ts",
};

// @ts-expect-error tests receive a TestContext
export const wrongContext: TestFunction = (ctx: number) => ctx;

await run(options);
