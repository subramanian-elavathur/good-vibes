import Context from "./Context";
import TestContext from "./TestContext";
import log, { LogLevel } from "./log";
import SimpleTAPReporter from "./SimpleTAPReporter";

interface BeforeAfter {
  (context: Context): void;
}
interface AsyncTest {
  (context: TestContext): void;
}

interface Test {
  name: string;
  test: AsyncTest;
  group: string;
}

interface TestGroup {
  sync?: boolean;
  before?: BeforeAfter;
  after?: BeforeAfter;
  tests: Test[];
}

interface GroupedTests {
  [key: string]: TestGroup;
}

export interface TestResult {
  name: string;
  status: boolean;
  group: string;
  message?: string;
}

interface Options {
  timeout?: number;
  snapshotsDirectory?: string;
  returnCodeOnFailure?: number;
  reportTestResults?: boolean;
  testResultsDirectory?: string;
}

const DEFAULT_TEST_GROUP = "Default";
export const DEBUG = "Debug";
const GLOBAL_TIMEOUT = 300_000; // 5 minutes

const testStore: GroupedTests = {
  [DEFAULT_TEST_GROUP]: {
    tests: [],
  },
};

const banner = () => {
  log(
    "\nWelcome to Good Vibes\n\nA Node.js testing library dedicated to Alicia Keys' Tiny Desk Performance\n\nWatch it here: https://www.youtube.com/watch?v=uwUt1fVLb3E\n"
  );
};

export const group = (groupName: string) => {
  return {
    before: (fn: BeforeAfter, overriddenGroupName?: string) =>
      before(fn, overriddenGroupName ?? groupName),
    test: (
      name: string,
      testImplementation: AsyncTest,
      overriddenGroupName?: string // to allow for debugging
    ) => test(name, testImplementation, overriddenGroupName ?? groupName),
    after: (fn: BeforeAfter, overriddenGroupName?: string) =>
      after(fn, overriddenGroupName ?? groupName),
    sync: () => sync(groupName),
  };
};

export const sync = (group?: string) => {
  const groupToUpdate = group ?? DEFAULT_TEST_GROUP;
  const existingGroup = testStore[groupToUpdate] ?? { tests: [] };
  testStore[groupToUpdate] = { ...existingGroup, sync: true };
};

export const before = (fn: BeforeAfter, group?: string) => {
  const groupToUpdate = group ?? DEFAULT_TEST_GROUP;
  const existingGroup = testStore[groupToUpdate] ?? { tests: [] };
  testStore[groupToUpdate] = { ...existingGroup, before: fn };
};

export const after = (fn: BeforeAfter, group?: string) => {
  const groupToUpdate = group ?? DEFAULT_TEST_GROUP;
  const existingGroup = testStore[groupToUpdate] ?? { tests: [] };
  testStore[groupToUpdate] = { ...existingGroup, after: fn };
};

export const test = (
  name: string,
  testImplementation: AsyncTest,
  group?: string
) => {
  const groupToUpdate = group ?? DEFAULT_TEST_GROUP;
  const existingGroup = testStore[groupToUpdate] ?? { tests: [] };
  testStore[groupToUpdate] = {
    ...existingGroup,
    tests: [
      ...existingGroup.tests,
      { name, test: testImplementation, group: groupToUpdate },
    ],
  };
};

const runOneTest = async (
  test: Test,
  options?: Options
): Promise<TestResult> => {
  log(`Running: ${test.name}`);
  const startTime = new Date().valueOf();
  let result: TestResult;
  try {
    const testResults = new Promise<boolean>((resolve) => {
      test.test(
        new TestContext(
          test.name,
          test.group,
          resolve,
          options?.snapshotsDirectory
        )
      );
    });
    result = {
      name: test.name,
      group: test.group,
      status: await testResults,
    };
  } catch (error) {
    result = {
      name: test.name,
      group: test.group,
      status: false,
      message: error?.message,
    };
  }
  const endTime = new Date().valueOf();
  log(
    `Finished: ${test.name} [${result.status ? "PASSED" : "FAILED"} in ${
      (endTime - startTime) / 1000
    } seconds]`,
    result.status ? LogLevel.SUCCESS : LogLevel.ERROR
  );
  return Promise.resolve(result);
};

const runBeforeOrAfter = async (
  beforeAfter: BeforeAfter,
  name: string
): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      beforeAfter(new Context(name, () => resolve(true)));
    } catch {
      resolve(false);
    }
  });
};

const runTestsInAGroup = async (
  group: string,
  options?: Options,
  reporter?: SimpleTAPReporter
): Promise<TestResult[]> => {
  const { before, tests, after, sync } = testStore[group];
  log(
    `Running ${tests.length} tests from ${group} group${
      sync ? " in synchronous mode" : ""
    }\n`
  );
  if (before) {
    log(`Running: Before script`);
    const startTime = new Date().valueOf();
    await runBeforeOrAfter(before, "Before");
    const endTime = new Date().valueOf();
    log(`Finished: Before script in ${(endTime - startTime) / 1000} seconds\n`);
  }

  let results: TestResult[] = [];
  if (sync) {
    for (const test of tests) {
      const result = await runOneTest(test, options);
      results.push(result);
    }
  } else {
    results = await Promise.all(tests.map((each) => runOneTest(each, options)));
  }

  if (after) {
    log(`\nRunning: After script`);
    const startTime = new Date().valueOf();
    await runBeforeOrAfter(after, "After");
    const endTime = new Date().valueOf();
    log(`Finished: After script in ${(endTime - startTime) / 1000} seconds\n`);
  }
  log(`\nFinished running ${tests.length} tests from ${group} group\n`);
  reporter?.add(group, results);
  return results.filter((each) => !each.status);
};

const terminateOnTimeout = (timeout?: number) => {
  setTimeout(() => {
    log(
      `\n[TIMEOUT] Global test timeout exceeded ${
        timeout / 1000
      } seconds. Exiting.`
    );
    process.exit(1);
  }, timeout ?? GLOBAL_TIMEOUT);
};

const run = async (options?: Options) => {
  banner();
  terminateOnTimeout(options?.timeout);
  const totalTests = Object.values(testStore).reduce(
    (acc, each) => [...acc, ...each.tests],
    []
  ).length;
  let failedTests: TestResult[] = [];
  const reporter = options.reportTestResults
    ? new SimpleTAPReporter(options.testResultsDirectory)
    : undefined;
  if (testStore[DEBUG]?.tests?.length) {
    await runTestsInAGroup(DEBUG, options, reporter);
    await reporter?.report();
    log(
      `[Important] Good vibes is running in Debug mode [Important]\n\nDebug mode allows you to run one or more tests to help you debug them easily.\nDebug mode always exits with return code 1 to prevent this change from being accidentally checked in to your codebase.\nSee logs above to find which tests were tagged to 'Debug' group and remove that group tag to resume normal mode.`
    );
    process.exit(1);
  } else {
    for (const group in testStore) {
      if (!testStore[group].tests.length) {
        continue;
      }
      const failedTestsInGroup = await runTestsInAGroup(
        group,
        options,
        reporter
      );
      failedTests = [...failedTests, ...failedTestsInGroup];
    }
    if (failedTests?.length) {
      await reporter?.report();
      log(
        `Hey ${failedTests.length}/${totalTests} tests failed, but its going to be ok. Start by going through the list below and adding some logs to figure out whats going wrong:`
      );
      failedTests.forEach((each, index) =>
        log(
          `${index}. [${each.group}] ${each.name} ${
            each.message ? `(${each.message})` : ""
          }`
        )
      );
      process.exit(options?.returnCodeOnFailure ?? 1);
    }
    await reporter?.report();
    log(`All ${totalTests} tests passed, good vibes :)`);
    process.exit(0);
  }
};

export default run;
