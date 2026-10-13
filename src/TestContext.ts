import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { diffJson } from "diff";
import Context, { type Finish } from "./Context";
import log, { LogLevel } from "./log";
import { errorMessage, formatValue } from "./util";

const DEFAULT_SNAPSHOTS_DIRECTORY = "test/__snapshots__";

/**
 * The expected error message: a string must equal the message exactly, a
 * RegExp must match it.
 */
export type ExpectedMessage = string | RegExp;

// Prefix every line so the diff can still be read when colors are disabled
const prefixLines = (value: string, prefix: string) =>
  value
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");

/**
 * Context passed to tests. Adds assertions on top of `log` and `done`.
 *
 * Failed assertions are logged and fail the test once it completes, the test
 * itself keeps running. Errors thrown by the test (e.g. from `node:assert`)
 * fail it too.
 */
export default class TestContext extends Context {
  /** Directory the snapshot baselines of this test are stored in */
  readonly snapshotsDirectory: string;
  #passedAssertions = 0;
  #failedAssertions = 0;
  #firstFailure?: string;

  constructor(
    testName: string,
    groupName: string,
    finish: Finish,
    snapshotsDirectory?: string,
  ) {
    super(testName, finish);
    this.snapshotsDirectory = path.join(
      snapshotsDirectory ?? DEFAULT_SNAPSHOTS_DIRECTORY,
      groupName,
    );
  }

  #pass(): this {
    this.#passedAssertions++;
    return this;
  }

  #fail(message: string): this {
    this.#failedAssertions++;
    this.#firstFailure ??= message;
    this.logWithLevel(message, LogLevel.ERROR);
    return this;
  }

  #failAssertion(description: string): this {
    const assertion = this.#passedAssertions + this.#failedAssertions + 1;
    return this.#fail(`Assertion ${assertion}: ${description}`);
  }

  /**
   * Asserts that `actualValue` is deeply and strictly equal to
   * `expectedValue`, with the same rules as `assert.deepStrictEqual`.
   */
  check<Type>(expectedValue: Type, actualValue: Type): this {
    return isDeepStrictEqual(expectedValue, actualValue)
      ? this.#pass()
      : this.#failAssertion(
          `Expected ${formatValue(expectedValue)} to match ${formatValue(actualValue)}`,
        );
  }

  #checkError(error: unknown, expected?: ExpectedMessage): this {
    const message = errorMessage(error);
    if (expected === undefined) {
      return this.#pass();
    }
    if (typeof expected === "string") {
      return message === expected
        ? this.#pass()
        : this.#failAssertion(
            `Expected error message ${formatValue(message)} to equal ${formatValue(expected)}`,
          );
    }
    return expected.test(message)
      ? this.#pass()
      : this.#failAssertion(
          `Expected error message ${formatValue(message)} to match ${formatValue(expected)}`,
        );
  }

  /**
   * Asserts that `fn` throws, and if `expected` is given, that the error
   * message equals (string) or matches (RegExp) it.
   */
  throws(fn: () => unknown, expected?: ExpectedMessage): this {
    try {
      fn();
    } catch (error) {
      return this.#checkError(error, expected);
    }
    return this.#failAssertion("Expected function to throw");
  }

  /**
   * Asserts that `promise` (or the promise returned by calling it) rejects,
   * and if `expected` is given, that the error message equals (string) or
   * matches (RegExp) it.
   */
  async rejects(
    promise: PromiseLike<unknown> | (() => PromiseLike<unknown>),
    expected?: ExpectedMessage,
  ): Promise<this> {
    try {
      await (typeof promise === "function" ? promise() : promise);
    } catch (error) {
      return this.#checkError(error, expected);
    }
    return this.#failAssertion("Expected promise to reject");
  }

  #getSnapshotPath(assertionName: string): string {
    return path.join(
      this.snapshotsDirectory,
      `${this.name}_${assertionName}.json`,
    );
  }

  async #writeSnapshot(snapshotPath: string, value: unknown) {
    this.log(`Writing snapshot baseline to ${snapshotPath}`);
    try {
      await mkdir(path.dirname(snapshotPath), { recursive: true });
      await writeFile(snapshotPath, `${JSON.stringify(value, null, 2)}\n`);
    } catch (error) {
      this.logWithLevel(
        `Failed to write snapshot baseline due to error: ${errorMessage(error)}`,
        LogLevel.ERROR,
      );
    }
  }

  /**
   * Compares `actualValue` with the baseline stored in the snapshots directory.
   *
   * Set `rebase` to `true` to create or update the baseline. Rebasing always fails
   * the test so the flag does not get committed by mistake.
   */
  async snapshot<Type>(
    assertionName: string,
    actualValue: Type,
    rebase = false,
  ): Promise<this> {
    const snapshotPath = this.#getSnapshotPath(assertionName);
    if (rebase) {
      await this.#writeSnapshot(snapshotPath, actualValue);
      return this.#fail(
        `Snapshot ${assertionName}: FAILED as the rebase flag is set, remove it once the baseline is updated`,
      );
    }

    let baseline: unknown;
    try {
      baseline = JSON.parse(await readFile(snapshotPath, "utf8"));
    } catch (error) {
      return this.#fail(
        `Snapshot ${assertionName}: FAILED as the baseline at ${snapshotPath} could not be read (${errorMessage(error)}). Set the rebase flag to true to create it`,
      );
    }

    const changes = diffJson(baseline as object, actualValue as object);
    if (!changes.some((change) => change.added || change.removed)) {
      this.logWithLevel(`Snapshot ${assertionName}: PASSED`, LogLevel.SUCCESS);
      return this.#pass();
    }

    this.#fail(
      `Snapshot ${assertionName}: FAILED, see diff below (- baseline, + actual)`,
    );
    for (const change of changes) {
      if (change.added) {
        log(prefixLines(change.value, "+ "), LogLevel.SUCCESS);
      } else if (change.removed) {
        log(prefixLines(change.value, "- "), LogLevel.ERROR);
      } else {
        log(prefixLines(change.value, "  "));
      }
    }
    return this;
  }

  /**
   * Marks the test as complete. The test passes if none of its assertions
   * failed. Only needed when the test is not an `async` function but takes
   * the context parameter, e.g. when it completes in a callback.
   */
  override done(): void {
    if (!this.markFinished()) {
      return;
    }
    const total = this.#passedAssertions + this.#failedAssertions;
    if (total) {
      this.logWithLevel(
        `${this.#passedAssertions}/${total} Assertions PASSED`,
        this.#failedAssertions ? LogLevel.ERROR : LogLevel.SUCCESS,
      );
    }
    this.finish(this.#failedAssertions === 0, this.#firstFailure);
  }
}
