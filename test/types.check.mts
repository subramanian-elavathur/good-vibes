// Type-level tests, checked by `npm run typecheck` (this file is not executed).
import type {
  HookFunction,
  Options,
  TestContext,
  TestFunction,
} from "../src/index.ts";

// Callbacks may return anything, such as the result of an expression-bodied
// arrow function, or a promise from an async function
export const returnsTimer: TestFunction = (ctx) =>
  setTimeout(() => ctx.done(), 1);
export const returnsPromise: HookFunction = (ctx) => {
  ctx.done();
  return Promise.resolve(5);
};

// Assertions can be chained and passed around
export const assertGreeting = (ctx: TestContext, actual: string): TestContext =>
  ctx.check("Hello, World!", actual);
export const snapshot: (ctx: TestContext) => Promise<TestContext> = (ctx) =>
  ctx.snapshot("name", { a: 1 });

export const options: Options = {
  timeout: 1000,
  snapshotsDirectory: "snapshots",
  returnCodeOnFailure: 2,
  reportTestResults: true,
  testResultsDirectory: "reports",
  executionTimePrecision: 2,
};

// @ts-expect-error tests receive a TestContext
export const wrongContext: TestFunction = (ctx: number) => ctx;
