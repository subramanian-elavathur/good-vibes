interface Check {
  (expected: any, actual: any): Promise<boolean>;
}

interface BeforeAfter {
  (done: () => void, log: (message: string) => void): void;
}
interface AsyncTest {
  (check: Check, log: (message: string) => void): void;
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
      "\nWelcome to Good VIbes\n\nA Node.js testing library dedicated to Alicia Keys' Tiny Desk Performance\n\nWatch it here: https://www.youtube.com/watch?v=uwUt1fVLb3E\n"
    );
  }
};

const logger = (name: string) => (message: string) =>
  console.log(`Log: ${name}: ${message}`);

const check = (resolve, testLogger) => (expected, actual) => {
  const result = expected === actual;
  if (!result) {
    testLogger(`Expected ${expected} to match ${actual}`);
  }
  return resolve(result);
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
      test.test(check(resolve, testLogger), testLogger);
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

const run = async () => {
  banner();
  const totalTests = Object.values(testStore).reduce(
    (acc, each) => [...acc, ...each.tests],
    []
  ).length;
  let failedTests: TestResult[] = [];
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
};

export default run;
