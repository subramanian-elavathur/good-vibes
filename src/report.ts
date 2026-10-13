import log, { LogLevel } from "./log";
import { GROUP_SEPARATOR, type RunOutcome, type TestResult } from "./runner";
import { firstLine } from "./util";

export interface RunError {
  file?: string;
  message: string;
}

export interface Summary extends Omit<RunOutcome, "errors"> {
  errors: RunError[];
}

export const printBanner = (): void => {
  log(
    "\nWelcome to Good Vibes\n\nA Node.js testing library dedicated to Alicia Keys' Tiny Desk Performance\n\nWatch it here: https://www.youtube.com/watch?v=uwUt1fVLb3E\n",
  );
};

const withMessage = (description: string, message?: string) =>
  message ? `${description} (${firstLine(message)})` : description;

const describeResult = ({ file, group, name, message }: TestResult) =>
  withMessage(
    [file, group, name].filter(Boolean).join(GROUP_SEPARATOR),
    message,
  );

const describeError = ({ file, message }: RunError) =>
  file ? withMessage(file, message) : message;

const MODE_NOTICES = {
  debug:
    "[Important] Good vibes is running in Debug mode [Important]\n\nDebug mode allows you to run one or more tests to help you debug them easily.\nDebug mode always exits with return code 1 to prevent this change from being accidentally checked in to your codebase.\nSee logs above to find which tests were tagged to 'Debug' group and remove that group tag to resume normal mode.",
  only: "[Important] Good vibes only ran the tests marked with `only` [Important]\n\nRuns that use `only` always exit with return code 1 to prevent this change from being accidentally checked in to your codebase.\nRemove the `only` option to run all tests.",
};

/**
 * Prints the summary of a run and returns `true` if it passed.
 */
export const printSummary = ({
  results,
  scriptFailures,
  errors,
  mode,
}: Summary): boolean => {
  const failedTests = results.filter((result) => !result.status);
  const failures = [
    ...failedTests.map(describeResult),
    ...scriptFailures.map(describeResult),
    ...errors.map(describeError),
  ];

  if (failures.length) {
    const problems = [`${failedTests.length}/${results.length} tests failed`];
    if (scriptFailures.length) {
      problems.push(`${scriptFailures.length} after script(s) failed`);
    }
    if (errors.length) {
      problems.push(`${errors.length} other error(s) occurred`);
    }
    log(
      `Hey ${problems.join(" and ")}, but its going to be ok. Start by going through the list below and adding some logs to figure out whats going wrong:`,
    );
    failures.forEach((failure, index) =>
      log(`${index + 1}. ${failure}`, LogLevel.ERROR),
    );
  } else if (!results.length) {
    log("No tests found", LogLevel.ERROR);
  } else {
    const skipped = results.filter((result) => result.skipped).length;
    log(
      `All ${results.length - skipped} tests passed${
        skipped ? ` (${skipped} skipped)` : ""
      }, good vibes :)`,
      LogLevel.SUCCESS,
    );
  }

  if (mode !== "normal") {
    log(`\n${MODE_NOTICES[mode]}`);
    return false;
  }
  return failures.length === 0 && results.length > 0;
};
