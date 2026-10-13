import { inspect } from "node:util";
import type Context from "./Context";
import log, { LogLevel } from "./log";
import { printBanner, printSummary } from "./report";
import {
  isManagedByCli,
  runningLabels,
  runRegisteredTests,
  type RunnerOptions,
} from "./runner";
import SimpleTAPReporter from "./SimpleTAPReporter";
import type TestContext from "./TestContext";
import { flushAndExit } from "./util";

export {
  after,
  before,
  calculateExecutionTime,
  concurrent,
  DEBUG,
  group,
  sync,
  test,
} from "./runner";
export type {
  Group,
  HookFunction,
  HookOptions,
  TestFunction,
  TestOptions,
  TestResult,
} from "./runner";
export type { ExpectedMessage } from "./TestContext";
export type { Context, TestContext };

export interface Options extends RunnerOptions {
  /**
   * Time in milliseconds all tests have to finish, after which good-vibes exits
   * with return code 1. Defaults to 5 minutes.
   */
  timeout?: number;
  /**
   * Timeout for each test, before and after script in milliseconds. Defaults
   * to 30 seconds, 0 disables it.
   */
  testTimeout?: number;
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
  /**
   * Only run tests whose name, or the name of one of their groups, matches.
   */
  grep?: string | RegExp;
}

const GLOBAL_TIMEOUT = 300_000; // 5 minutes

const terminateOnTimeout = (timeout: number = GLOBAL_TIMEOUT) => {
  setTimeout(() => {
    log(
      `\n[TIMEOUT] Global test timeout exceeded ${timeout / 1000} seconds. Exiting.`,
      LogLevel.ERROR,
    );
    const unfinished = runningLabels();
    if (unfinished.length) {
      log(
        `The following did not finish:\n${unfinished
          .map((label) => `- ${label}`)
          .join("\n")}`,
        LogLevel.ERROR,
      );
    }
    flushAndExit(1);
  }, timeout);
};

/**
 * Runs all registered tests, then exits the process with return code 0 if they
 * all passed or `returnCodeOnFailure` (default 1) if any failed.
 *
 * Not needed when tests are run with the good-vibes command, which ignores it.
 */
export const run = async (options: Options = {}): Promise<void> => {
  if (isManagedByCli()) {
    return;
  }
  printBanner();
  terminateOnTimeout(options.timeout);
  let exitCode: number;
  try {
    const reporter = options.reportTestResults
      ? new SimpleTAPReporter(options.testResultsDirectory)
      : undefined;
    const outcome = await runRegisteredTests(options, reporter);
    await reporter?.report();
    const errors = outcome.errors.map((message) => ({ message }));
    const passed = printSummary({ ...outcome, errors });
    exitCode =
      passed || outcome.mode !== "normal"
        ? Number(!passed)
        : (options.returnCodeOnFailure ?? 1);
  } catch (error) {
    log(`Good vibes failed unexpectedly: ${inspect(error)}`, LogLevel.ERROR);
    exitCode = 1;
  }
  flushAndExit(exitCode);
};

export default run;
