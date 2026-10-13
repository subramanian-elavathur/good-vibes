import { inspect } from "node:util";
import Context from "./Context";
import log, { LogLevel } from "./log";
import SimpleTAPReporter from "./SimpleTAPReporter";
import TestContext from "./TestContext";
import { errorMessage } from "./util";

export type { Context, TestContext };

/**
 * A `before` or `after` script. Call `context.done()` once it is complete.
 * The return value is ignored, unless it is a promise that rejects.
 */
export type HookFunction = (context: Context) => unknown;

/**
 * A test. Call `context.done()` once it is complete. The return value is
 * ignored, unless it is a promise that rejects.
 */
export type TestFunction = (context: TestContext) => unknown;

interface Test {
  name: string;
  test: TestFunction;
  group: string;
}

interface TestGroup {
  sync?: boolean;
  before?: HookFunction;
  after?: HookFunction;
  tests: Test[];
}

export interface TestResult {
  name: string;
  status: boolean;
  group: string;
  message?: string;
}

export interface Options {
  /**
   * Time in milliseconds all tests have to finish, after which good-vibes exits
   * with return code 1. Defaults to 5 minutes.
   */
  timeout?: number;
  /**
   * Directory where snapshot baselines are stored, relative to the current
   * working directory. Defaults to `test/__snapshots__`.
   */
  snapshotsDirectory?: string;
  /**
   * Return code used when one or more tests fail. Defaults to 1.
   */
  returnCodeOnFailure?: number;
  /**
   * Write a TAP report for every group of tests. Defaults to `false`.
   */
  reportTestResults?: boolean;
  /**
   * Directory the TAP reports are written to, relative to the current working
   * directory. Defaults to `test-results`.
   */
  testResultsDirectory?: string;
  /**
   * Number of decimal places used when printing execution times in seconds.
   * Defaults to 3.
   */
  executionTimePrecision?: number;
}

const DEFAULT_TEST_GROUP = "Default";
export const DEBUG = "Debug";
const GLOBAL_TIMEOUT = 300_000; // 5 minutes
const DEFAULT_EXECUTION_TIME_PRECISION = 3;

const testStore: Record<string, TestGroup> = {
  [DEFAULT_TEST_GROUP]: {
    tests: [],
  },
};

// Tests and scripts that have started but not finished, listed on timeout
const inProgress = new Set<{ label: string }>();

/**
 * Converts the time between `startTime` and `endTime` (in milliseconds) to
 * seconds, rounded to `precision` decimal places.
 */
export const calculateExecutionTime = (
  startTime: number,
  endTime: number,
  precision: number = DEFAULT_EXECUTION_TIME_PRECISION,
): number => {
  const digits = Math.min(Math.max(Math.trunc(precision), 0), 100);
  return Number(((endTime - startTime) / 1000).toFixed(digits));
};

const banner = () => {
  log(
    "\nWelcome to Good Vibes\n\nA Node.js testing library dedicated to Alicia Keys' Tiny Desk Performance\n\nWatch it here: https://www.youtube.com/watch?v=uwUt1fVLb3E\n",
  );
};

const getGroup = (name: string = DEFAULT_TEST_GROUP): TestGroup =>
  (testStore[name] ??= { tests: [] });

/**
 * Returns `before`, `test`, `after` and `sync` bound to `groupName`.
 */
export const group = (groupName: string) => {
  return {
    before: (fn: HookFunction, overriddenGroupName?: string) =>
      before(fn, overriddenGroupName ?? groupName),
    test: (
      name: string,
      testImplementation: TestFunction,
      overriddenGroupName?: string, // to allow for debugging
    ) => test(name, testImplementation, overriddenGroupName ?? groupName),
    after: (fn: HookFunction, overriddenGroupName?: string) =>
      after(fn, overriddenGroupName ?? groupName),
    sync: () => sync(groupName),
  };
};

/**
 * Runs the tests in a group one at a time, in the order they were declared.
 */
export const sync = (group?: string): void => {
  getGroup(group).sync = true;
};

/**
 * Registers a script that runs once before all tests in a group.
 */
export const before = (fn: HookFunction, group?: string): void => {
  getGroup(group).before = fn;
};

/**
 * Registers a script that runs once after all tests in a group.
 */
export const after = (fn: HookFunction, group?: string): void => {
  getGroup(group).after = fn;
};

/**
 * Registers a test. Tests only run once `run()` is called.
 */
export const test = (
  name: string,
  testImplementation: TestFunction,
  group: string = DEFAULT_TEST_GROUP,
): void => {
  getGroup(group).tests.push({ name, test: testImplementation, group });
};

// Resolves once `done()` is called. Rejects if the callback throws or returns a
// rejected promise, so a failing async test cannot crash the whole run.
const waitForDone = (
  start: (done: (result: boolean) => void) => unknown,
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    Promise.resolve(start(resolve)).catch(reject);
  });

const runOneTest = async (
  test: Test,
  options: Options,
): Promise<TestResult> => {
  log(`Running: ${test.name}`);
  const token = { label: `[${test.group}] ${test.name}` };
  inProgress.add(token);
  const startTime = performance.now();
  let result: TestResult;
  try {
    const status = await waitForDone((done) =>
      test.test(
        new TestContext(
          test.name,
          test.group,
          done,
          options.snapshotsDirectory,
        ),
      ),
    );
    result = { name: test.name, group: test.group, status };
  } catch (error) {
    log(`Log: ${test.name}: ${inspect(error)}`, LogLevel.ERROR);
    result = {
      name: test.name,
      group: test.group,
      status: false,
      message: errorMessage(error),
    };
  }
  inProgress.delete(token);
  log(
    `Finished: ${test.name} [${
      result.status ? "PASSED" : "FAILED"
    } in ${calculateExecutionTime(
      startTime,
      performance.now(),
      options.executionTimePrecision,
    )} seconds]`,
    result.status ? LogLevel.SUCCESS : LogLevel.ERROR,
  );
  return result;
};

// Returns the error message if the script failed
const runScript = async (
  name: "Before" | "After",
  script: HookFunction,
  group: string,
  options: Options,
): Promise<string | undefined> => {
  log(`${name === "After" ? "\n" : ""}Running: ${name} script`);
  const token = { label: `[${group}] ${name} script` };
  inProgress.add(token);
  const startTime = performance.now();
  let failure: string | undefined;
  try {
    await waitForDone((done) => script(new Context(name, done)));
  } catch (error) {
    log(`Log: ${name}: ${inspect(error)}`, LogLevel.ERROR);
    failure = errorMessage(error);
  }
  inProgress.delete(token);
  const executionTime = calculateExecutionTime(
    startTime,
    performance.now(),
    options.executionTimePrecision,
  );
  if (failure === undefined) {
    log(`Finished: ${name} script in ${executionTime} seconds\n`);
  } else {
    log(
      `Finished: ${name} script [FAILED in ${executionTime} seconds]\n`,
      LogLevel.ERROR,
    );
  }
  return failure;
};

interface GroupResults {
  tests: TestResult[];
  afterScript?: TestResult;
}

const runTestsInAGroup = async (
  group: string,
  options: Options,
  reporter?: SimpleTAPReporter,
): Promise<GroupResults> => {
  const { before, tests, after, sync } = testStore[group];
  log(
    `Running ${tests.length} tests from ${group} group${
      sync ? " in synchronous mode" : ""
    }\n`,
  );
  const beforeFailure = before
    ? await runScript("Before", before, group, options)
    : undefined;

  let results: TestResult[] = [];
  if (beforeFailure !== undefined) {
    log(
      `Skipping all tests in ${group} group as the before script failed`,
      LogLevel.ERROR,
    );
    results = tests.map(({ name }) => ({
      name,
      group,
      status: false,
      message: `Before script failed: ${beforeFailure}`,
    }));
  } else if (sync) {
    for (const test of tests) {
      results.push(await runOneTest(test, options));
    }
  } else {
    results = await Promise.all(tests.map((each) => runOneTest(each, options)));
  }

  let afterScript: TestResult | undefined;
  if (after) {
    const afterFailure = await runScript("After", after, group, options);
    if (afterFailure !== undefined) {
      afterScript = {
        name: "After script",
        group,
        status: false,
        message: afterFailure,
      };
    }
  }
  log(`\nFinished running ${tests.length} tests from ${group} group\n`);
  reporter?.add(group, afterScript ? [...results, afterScript] : results);
  return { tests: results, afterScript };
};

const terminateOnTimeout = (timeout: number = GLOBAL_TIMEOUT) => {
  setTimeout(() => {
    log(
      `\n[TIMEOUT] Global test timeout exceeded ${timeout / 1000} seconds. Exiting.`,
      LogLevel.ERROR,
    );
    if (inProgress.size) {
      log(
        `The following did not finish, did they forget to call done()?\n${[
          ...inProgress,
        ]
          .map(({ label }) => `- ${label}`)
          .join("\n")}`,
        LogLevel.ERROR,
      );
    }
    process.exit(1);
  }, timeout);
};

// Returns the process exit code
const runAllTests = async (options: Options): Promise<number> => {
  const reporter = options.reportTestResults
    ? new SimpleTAPReporter(options.testResultsDirectory)
    : undefined;

  if (testStore[DEBUG]?.tests.length) {
    await runTestsInAGroup(DEBUG, options, reporter);
    await reporter?.report();
    log(
      `[Important] Good vibes is running in Debug mode [Important]\n\nDebug mode allows you to run one or more tests to help you debug them easily.\nDebug mode always exits with return code 1 to prevent this change from being accidentally checked in to your codebase.\nSee logs above to find which tests were tagged to 'Debug' group and remove that group tag to resume normal mode.`,
    );
    return 1;
  }

  const totalTests = Object.values(testStore).reduce(
    (count, each) => count + each.tests.length,
    0,
  );
  const failedTests: TestResult[] = [];
  const failedScripts: TestResult[] = [];
  for (const group in testStore) {
    if (!testStore[group].tests.length) {
      continue;
    }
    const { tests, afterScript } = await runTestsInAGroup(
      group,
      options,
      reporter,
    );
    failedTests.push(...tests.filter((each) => !each.status));
    if (afterScript) {
      failedScripts.push(afterScript);
    }
  }
  await reporter?.report();

  if (!failedTests.length && !failedScripts.length) {
    log(`All ${totalTests} tests passed, good vibes :)`);
    return 0;
  }
  const failedScriptsSummary = failedScripts.length
    ? ` and ${failedScripts.length} after script(s) failed`
    : "";
  log(
    `Hey ${failedTests.length}/${totalTests} tests failed${failedScriptsSummary}, but its going to be ok. Start by going through the list below and adding some logs to figure out whats going wrong:`,
  );
  [...failedTests, ...failedScripts].forEach((each, index) =>
    log(
      `${index + 1}. [${each.group}] ${each.name}${
        each.message ? ` (${each.message})` : ""
      }`,
    ),
  );
  return options.returnCodeOnFailure ?? 1;
};

/**
 * Runs all registered tests, then exits the process with return code 0 if they
 * all passed or `returnCodeOnFailure` (default 1) if any failed.
 */
export const run = async (options: Options = {}): Promise<void> => {
  banner();
  terminateOnTimeout(options.timeout);
  let exitCode: number;
  try {
    exitCode = await runAllTests(options);
  } catch (error) {
    log(`Good vibes failed unexpectedly: ${inspect(error)}`, LogLevel.ERROR);
    exitCode = 1;
  }
  process.exit(exitCode);
};

export default run;
