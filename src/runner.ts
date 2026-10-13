import Context, { type Finish } from "./Context";
import log, { LogLevel } from "./log";
import type SimpleTAPReporter from "./SimpleTAPReporter";
import TestContext from "./TestContext";
import { errorMessage, formatError, isPromiseLike, TimeoutError } from "./util";

/**
 * A `before` or `after` script. It is complete once the promise it returns
 * settles (e.g. it is an `async` function), once it returns if it does not
 * take the context parameter, or once it calls `context.done()`.
 */
export type HookFunction = (context: Context) => unknown;

/**
 * A test. It is complete once the promise it returns settles (e.g. it is an
 * `async` function), once it returns if it does not take the context
 * parameter, or once it calls `context.done()`. It fails if it throws, if the
 * promise rejects or if one of the context's assertions fails.
 */
export type TestFunction = (context: TestContext) => unknown;

export interface HookOptions {
  /** Name of the group, defaults to `Default` or the group it is registered on */
  group?: string;
  /** Timeout in milliseconds, overrides the default timeout. 0 disables it */
  timeout?: number;
}

export interface TestOptions extends HookOptions {
  /** Skips the test. A string is reported as the reason */
  skip?: boolean | string;
  /**
   * Only runs the tests marked with `only` in this file. Like the Debug group,
   * good-vibes then exits with return code 1 so it is not committed by mistake.
   */
  only?: boolean;
}

export interface TestResult {
  /** Name of the test, or "After script" when an after script failed */
  name: string;
  /** Full name of the group, names of nested groups are separated by " › " */
  group: string;
  /** `false` if the test failed */
  status: boolean;
  /** `true` if the test was skipped */
  skipped?: boolean;
  /** Why the test failed, or why it was skipped */
  message?: string;
  /** The test file, when tests are run with the good-vibes command */
  file?: string;
}

/**
 * The api returned by `group()`, bound to a group of tests.
 */
export interface Group {
  /** Full name of the group */
  readonly name: string;
  /**
   * Registers a script that runs once before the tests in the group. Passing
   * a group name (e.g. DEBUG) registers it on that group instead.
   */
  before: (fn: HookFunction, groupOrOptions?: string | HookOptions) => void;
  /**
   * Registers a script that runs once after the tests in the group, even if
   * they failed. Passing a group name registers it on that group instead.
   */
  after: (fn: HookFunction, groupOrOptions?: string | HookOptions) => void;
  /**
   * Registers a test in the group. Passing a group name (e.g. DEBUG)
   * registers it in that group instead.
   */
  test: (
    name: string,
    fn: TestFunction,
    groupOrOptions?: string | TestOptions,
  ) => void;
  /**
   * Returns a nested group. Its tests run in the order it was declared among
   * the tests of this group, after this group's before script.
   */
  group: (name: string) => Group;
  /** Runs the tests in this group concurrently instead of one after another */
  concurrent: () => void;
  /** @deprecated Tests in a group run one after another by default */
  sync: () => void;
}

export interface RunnerOptions {
  /** Timeout for each test and script in milliseconds. 0 disables it */
  testTimeout?: number;
  snapshotsDirectory?: string;
  executionTimePrecision?: number;
  /** Only runs tests whose name, or the name of one of their groups, matches */
  grep?: string | RegExp;
}

export interface RunOutcome {
  results: TestResult[];
  scriptFailures: TestResult[];
  /** Problems outside of tests, such as errors thrown after a test finished */
  errors: string[];
  /** "debug" and "only" runs always fail, so they are not committed */
  mode: "normal" | "debug" | "only";
}

interface TestNode {
  kind: "test";
  name: string;
  fn: TestFunction;
  group: GroupNode;
  options: TestOptions;
}

interface Hook {
  fn: HookFunction;
  timeout?: number;
}

interface GroupNode {
  kind: "group";
  name: string;
  fullName: string;
  parent?: GroupNode;
  before?: Hook;
  after?: Hook;
  concurrent: boolean;
  items: (TestNode | GroupNode)[];
}

export const DEFAULT_TEST_GROUP = "Default";
export const DEBUG = "Debug";
export const GROUP_SEPARATOR = " › ";
export const DEFAULT_TEST_TIMEOUT = 30_000; // 30 seconds
const DEFAULT_EXECUTION_TIME_PRECISION = 3;

const groups = new Map<string, GroupNode>();
const rootGroups: GroupNode[] = [];

const createGroup = (name: string, parent?: GroupNode): GroupNode => {
  const fullName = parent
    ? `${parent.fullName}${GROUP_SEPARATOR}${name}`
    : name;
  const group: GroupNode = {
    kind: "group",
    name,
    fullName,
    parent,
    concurrent: false,
    items: [],
  };
  groups.set(fullName, group);
  (parent ? parent.items : rootGroups).push(group);
  return group;
};

const getGroup = (fullName: string = DEFAULT_TEST_GROUP): GroupNode =>
  groups.get(fullName) ?? createGroup(fullName);

const getChildGroup = (parent: GroupNode, name: string): GroupNode =>
  groups.get(`${parent.fullName}${GROUP_SEPARATOR}${name}`) ??
  createGroup(name, parent);

// The default group always runs first
getGroup(DEFAULT_TEST_GROUP);

const parseOptions = <Type extends HookOptions>(
  groupOrOptions?: string | Type,
): Type =>
  typeof groupOrOptions === "string"
    ? ({ group: groupOrOptions } as Type)
    : ({ ...groupOrOptions } as Type);

const addTest = (
  group: GroupNode,
  name: string,
  fn: TestFunction,
  options: TestOptions,
) => {
  group.items.push({ kind: "test", name, fn, group, options });
};

/**
 * Registers a test. Tests only run once `run()` is called, or when the file
 * is run with the good-vibes command.
 */
export const test = (
  name: string,
  testImplementation: TestFunction,
  groupOrOptions?: string | TestOptions,
): void => {
  const options = parseOptions(groupOrOptions);
  addTest(getGroup(options.group), name, testImplementation, options);
};

/**
 * Registers a script that runs once before all tests in a group.
 */
export const before = (
  fn: HookFunction,
  groupOrOptions?: string | HookOptions,
): void => {
  const { group, timeout } = parseOptions(groupOrOptions);
  getGroup(group).before = { fn, timeout };
};

/**
 * Registers a script that runs once after all tests in a group, even if they
 * failed.
 */
export const after = (
  fn: HookFunction,
  groupOrOptions?: string | HookOptions,
): void => {
  const { group, timeout } = parseOptions(groupOrOptions);
  getGroup(group).after = { fn, timeout };
};

/**
 * Runs the tests in a group concurrently instead of one after another.
 */
export const concurrent = (group?: string): void => {
  getGroup(group).concurrent = true;
};

/**
 * @deprecated Tests in a group run one after another by default
 */
export const sync = (group?: string): void => {
  getGroup(group).concurrent = false;
};

const groupApi = (node: GroupNode): Group => {
  // An explicit group name, such as DEBUG, takes precedence
  const resolve = <Type extends HookOptions>(
    groupOrOptions?: string | Type,
  ) => {
    const options = parseOptions(groupOrOptions);
    return {
      target: options.group === undefined ? node : getGroup(options.group),
      options,
    };
  };
  return {
    name: node.fullName,
    before: (fn, groupOrOptions) => {
      const { target, options } = resolve(groupOrOptions);
      target.before = { fn, timeout: options.timeout };
    },
    after: (fn, groupOrOptions) => {
      const { target, options } = resolve(groupOrOptions);
      target.after = { fn, timeout: options.timeout };
    },
    test: (name, fn, groupOrOptions) => {
      const { target, options } = resolve(groupOrOptions);
      addTest(target, name, fn, options);
    },
    group: (name) => groupApi(getChildGroup(node, name)),
    concurrent: () => {
      node.concurrent = true;
    },
    sync: () => {
      node.concurrent = false;
    },
  };
};

/**
 * Returns `before`, `test`, `after`, `group` and `concurrent` bound to `groupName`.
 */
export const group = (groupName: string): Group =>
  groupApi(getGroup(groupName));

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

let managedByCli = false;

/** Called by the good-vibes command, which then runs the tests itself */
export const setManagedByCli = (): void => {
  managedByCli = true;
};

export const isManagedByCli = (): boolean => managedByCli;

interface Running {
  label: string;
  fail: (error: unknown) => void;
}

// Tests and scripts that have started but not finished
const running = new Set<Running>();

export const runningLabels = (): string[] =>
  [...running].map(({ label }) => label);

const runErrors: string[] = [];

// Errors thrown outside of the promise chain of a test (e.g. in a timer
// callback) fail the tests that are running at the time
const onUncaughtError = (error: unknown) => {
  if (running.size) {
    for (const entry of running) {
      entry.fail(error);
    }
    return;
  }
  log(
    `Uncaught error outside of a test: ${formatError(error)}`,
    LogLevel.ERROR,
  );
  runErrors.push(`Uncaught error outside of a test: ${errorMessage(error)}`);
};

interface Completion {
  passed: boolean;
  failure?: string;
}

const execute = <ContextType extends Context>(
  label: string,
  fn: (context: ContextType) => unknown,
  createContext: (finish: Finish) => ContextType,
  timeout: number,
): Promise<Completion> => {
  const entry: Running = { label, fail: () => undefined };
  running.add(entry);
  let timer: NodeJS.Timeout | undefined;
  return new Promise<Completion>((resolve, reject) => {
    entry.fail = reject;
    let waitingForDone = true;
    if (timeout > 0 && Number.isFinite(timeout)) {
      timer = setTimeout(() => {
        const waitingFor = waitingForDone
          ? " waiting for done() to be called"
          : "";
        reject(new TimeoutError(`Timed out after ${timeout} ms${waitingFor}`));
      }, timeout);
    }
    const context = createContext((passed, failure) =>
      resolve({ passed, failure }),
    );
    const returned = fn(context);
    if (isPromiseLike(returned)) {
      waitingForDone = false;
      returned.then(() => context.done(), reject);
    } else if (fn.length === 0) {
      context.done();
    }
  }).finally(() => {
    clearTimeout(timer);
    running.delete(entry);
  });
};

interface RunState {
  options: RunnerOptions;
  testTimeout: number;
  isSelected: (test: TestNode) => boolean;
  results: TestResult[];
  scriptFailures: TestResult[];
  reporter?: SimpleTAPReporter;
}

const executionTime = (startTime: number, state: RunState) =>
  calculateExecutionTime(
    startTime,
    performance.now(),
    state.options.executionTimePrecision,
  );

const runTest = async (test: TestNode, state: RunState): Promise<void> => {
  const group = test.group.fullName;
  const { skip, timeout = state.testTimeout } = test.options;
  if (skip) {
    const reason = typeof skip === "string" ? skip : undefined;
    log(`Skipped: ${test.name}${reason ? ` (${reason})` : ""}`);
    state.results.push({
      name: test.name,
      group,
      status: true,
      skipped: true,
      message: reason,
    });
    return;
  }

  log(`Running: ${test.name}`);
  const startTime = performance.now();
  let result: TestResult;
  try {
    const { passed, failure } = await execute(
      `${group}${GROUP_SEPARATOR}${test.name}`,
      test.fn,
      (finish) =>
        new TestContext(
          test.name,
          group,
          finish,
          state.options.snapshotsDirectory,
        ),
      timeout,
    );
    result = { name: test.name, group, status: passed, message: failure };
  } catch (error) {
    log(`Log: ${test.name}: ${formatError(error)}`, LogLevel.ERROR);
    result = {
      name: test.name,
      group,
      status: false,
      message: errorMessage(error),
    };
  }
  log(
    `Finished: ${test.name} [${result.status ? "PASSED" : "FAILED"} in ${executionTime(
      startTime,
      state,
    )} seconds]`,
    result.status ? LogLevel.SUCCESS : LogLevel.ERROR,
  );
  state.results.push(result);
};

// Returns the error message if the script failed
const runScript = async (
  name: "Before" | "After",
  hook: Hook,
  group: GroupNode,
  state: RunState,
): Promise<string | undefined> => {
  log(`${name === "After" ? "\n" : ""}Running: ${name} script`);
  const startTime = performance.now();
  let failure: string | undefined;
  try {
    await execute(
      `${group.fullName}${GROUP_SEPARATOR}${name} script`,
      hook.fn,
      (finish) => new Context(name, finish),
      hook.timeout ?? state.testTimeout,
    );
  } catch (error) {
    log(`Log: ${name}: ${formatError(error)}`, LogLevel.ERROR);
    failure = errorMessage(error);
  }
  const time = executionTime(startTime, state);
  if (failure === undefined) {
    log(`Finished: ${name} script in ${time} seconds\n`);
  } else {
    log(
      `Finished: ${name} script [FAILED in ${time} seconds]\n`,
      LogLevel.ERROR,
    );
  }
  return failure;
};

const testsIn = (group: GroupNode): TestNode[] =>
  group.items.flatMap((item) =>
    item.kind === "group" ? testsIn(item) : [item],
  );

const runGroup = async (group: GroupNode, state: RunState): Promise<void> => {
  const tests = testsIn(group).filter(state.isSelected);
  if (!tests.length) {
    return;
  }
  log(
    `Running ${tests.length} tests from ${group.fullName} group${
      group.concurrent ? " concurrently" : ""
    }\n`,
  );
  // Scripts are skipped when there is nothing to set up for
  const runScripts = tests.some((test) => !test.options.skip);

  const beforeFailure =
    runScripts && group.before
      ? await runScript("Before", group.before, group, state)
      : undefined;
  if (beforeFailure !== undefined) {
    log(
      `Skipping all tests in ${group.fullName} group as the before script failed`,
      LogLevel.ERROR,
    );
    for (const test of tests) {
      state.results.push({
        name: test.name,
        group: test.group.fullName,
        status: false,
        message: `Before script failed: ${beforeFailure}`,
      });
    }
  } else {
    const runItem = async (item: TestNode | GroupNode) => {
      if (item.kind === "group") {
        await runGroup(item, state);
      } else if (state.isSelected(item)) {
        await runTest(item, state);
      }
    };
    if (group.concurrent) {
      await Promise.all(group.items.map(runItem));
    } else {
      for (const item of group.items) {
        await runItem(item);
      }
    }
  }

  if (runScripts && group.after) {
    const failure = await runScript("After", group.after, group, state);
    if (failure !== undefined) {
      state.scriptFailures.push({
        name: "After script",
        group: group.fullName,
        status: false,
        message: failure,
      });
    }
  }
  log(
    `\nFinished running ${tests.length} tests from ${group.fullName} group\n`,
  );
  state.reporter?.add(
    group.fullName,
    [...state.results, ...state.scriptFailures].filter(
      (result) => result.group === group.fullName,
    ),
  );
};

const toRegExp = (pattern: string | RegExp) =>
  // Without the g and y flags, test() does not depend on previous calls
  typeof pattern === "string"
    ? new RegExp(pattern)
    : new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ""));

const ancestors = (group: GroupNode): GroupNode[] =>
  group.parent ? [group, ...ancestors(group.parent)] : [group];

/**
 * Runs the registered tests and returns their results.
 */
export const runRegisteredTests = async (
  options: RunnerOptions,
  reporter?: SimpleTAPReporter,
): Promise<RunOutcome> => {
  process.on("uncaughtException", onUncaughtError);
  process.on("unhandledRejection", onUncaughtError);

  const grep = options.grep === undefined ? undefined : toRegExp(options.grep);
  const onlyMode = rootGroups
    .flatMap(testsIn)
    .some((test) => test.options.only);
  const state: RunState = {
    options,
    testTimeout: options.testTimeout ?? DEFAULT_TEST_TIMEOUT,
    isSelected: (test) =>
      (!onlyMode || test.options.only === true) &&
      (!grep ||
        grep.test(test.name) ||
        ancestors(test.group).some((group) => grep.test(group.name))),
    results: [],
    scriptFailures: [],
    reporter,
  };

  const debugGroup = groups.get(DEBUG);
  const debugMode =
    debugGroup !== undefined &&
    testsIn(debugGroup).some((test) => state.isSelected(test));
  for (const group of debugGroup && debugMode ? [debugGroup] : rootGroups) {
    await runGroup(group, state);
  }

  return {
    results: state.results,
    scriptFailures: state.scriptFailures,
    errors: runErrors,
    mode: debugMode ? "debug" : onlyMode ? "only" : "normal",
  };
};
