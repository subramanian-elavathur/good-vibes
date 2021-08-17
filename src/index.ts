import Verify from "./Verify";

export interface Logger {
  (message: string): void;
}
interface BeforeAfter {
  (done: () => void, log: Logger): void;
}
interface AsyncTest {
  (verify: Verify, log: Logger): void;
}

interface Test {
  name: string;
  test: AsyncTest;
  group: string;
}

interface TestGroup {
  before?: BeforeAfter;
  after?: BeforeAfter;
  tests: Test[];
}

interface GroupedTests {
  [key: string]: TestGroup;
}

interface TestResult {
  name: string;
  status: boolean;
  group: string;
  message?: string;
}

const DEFAULT_TEST_GROUP = "Default";
export const DEBUG = "Debug";
const GLOBAL_TIMEOUT = 300_000; // 5 minutes

const testStore: GroupedTests = {
  [DEFAULT_TEST_GROUP]: {
    tests: [],
  },
};

let promptPrinted = false;

const banner = () => {
  if (!promptPrinted) {
    promptPrinted = true;
    console.log(
      "\nWelcome to Good Vibes\n\nA Node.js testing library dedicated to Alicia Keys' Tiny Desk Performance\n\nWatch it here: https://www.youtube.com/watch?v=uwUt1fVLb3E\n"
    );
  }
};

const logger =
  (name: string): Logger =>
  (message) =>
    console.log(`Log: ${name}: ${message}`);

export const group = (groupName: string) => {
  return {
    before: (fn: BeforeAfter) => before(fn, groupName),
    test: (name: string, testImplementation: AsyncTest) =>
      test(name, testImplementation, groupName),
    after: (fn: BeforeAfter) => after(fn, groupName),
  };
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

const runOneTest = async (test: Test): Promise<TestResult> => {
  console.log(`Running: ${test.name}`);
  const startTime = new Date().valueOf();
  let result: TestResult;
  try {
    const testLogger = logger(test.name);
    const testResults = new Promise<boolean>((resolve) => {
      test.test(new Verify(resolve, testLogger), testLogger);
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
  console.log(
    `Finished: ${test.name} [${result.status ? "PASSED" : "FAILED"} in ${
      (endTime - startTime) / 1000
    } seconds]`
  );
  return Promise.resolve(result);
};

const runBeforeOrAfter = async (
  beforeAfter: BeforeAfter,
  log: (message: string) => void
): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      beforeAfter(() => resolve(true), log);
    } catch {
      resolve(false);
    }
  });
};

const runTestsInAGroup = async (group: string): Promise<TestResult[]> => {
  const { before, tests, after } = testStore[group];
  console.log(`Running ${tests.length} tests from ${group} group\n`);
  if (before) {
    console.log(`Running: Before script`);
    await runBeforeOrAfter(before, logger("Before"));
    console.log(`Finished: Before script\n`);
  }
  const results = await Promise.all(tests.map(runOneTest));
  if (after) {
    console.log(`\nRunning: After script`);
    await runBeforeOrAfter(after, logger("After"));
    console.log(`Finished: After script`);
  }
  console.log(`\nFinished running ${tests.length} tests from ${group} group\n`);
  return results.filter((each) => !each.status);
};

const terminateOnTimeout = (timeout?: number) => {
  setTimeout(() => {
    console.log(
      `\n[TIMEOUT] Global test timeout exceeded ${
        timeout / 1000
      } seconds. Exiting.`
    );
    process.exit(1);
  }, timeout ?? GLOBAL_TIMEOUT);
};

const run = async (timeout?: number) => {
  banner();
  terminateOnTimeout(timeout);
  const totalTests = Object.values(testStore).reduce(
    (acc, each) => [...acc, ...each.tests],
    []
  ).length;
  let failedTests: TestResult[] = [];
  if (testStore[DEBUG]?.tests?.length) {
    await runTestsInAGroup(DEBUG);
    console.log(
      `[Important] Good vibes is running in Debug mode [Important]\n\nDebug mode allows you to run one or more tests to help you debug them easily.\nDebug mode always exits with return code 1 to prevent this change from being accidentally checked in to your codebase.\nSee logs above to find which tests were tagged to 'Debug' group and remove that group tag to resume normal mode.`
    );
    process.exit(1);
  } else {
    for (const group in testStore) {
      if (!testStore[group].tests.length) {
        continue;
      }
      const failedTestsInGroup = await runTestsInAGroup(group);
      failedTests = [...failedTests, ...failedTestsInGroup];
    }
    if (failedTests?.length) {
      console.log(
        `Hey ${failedTests.length}/${totalTests} tests failed, but its going to be ok. Start by going through the list below and adding some logs to figure out whats going wrong:`
      );
      failedTests.forEach((each, index) =>
        console.log(
          `${index}. [${each.group}] ${each.name} ${
            each.message ? `(${each.message})` : ""
          }`
        )
      );
      process.exit(1);
    }
    console.log(`All ${totalTests} tests passed, good vibes :)`);
    process.exit(0);
  }
};

export default run;
