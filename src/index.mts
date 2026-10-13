// ES module entry point. It re-exports the CommonJS build instead of being a
// separate copy of the library, so `import` and `require` share one registry of
// tests (avoiding the "dual package hazard").
export {
  after,
  before,
  calculateExecutionTime,
  DEBUG,
  group,
  run,
  run as default,
  sync,
  test,
} from "./index.js";

export type {
  Context,
  HookFunction,
  Options,
  TestContext,
  TestFunction,
  TestResult,
} from "./index.js";
