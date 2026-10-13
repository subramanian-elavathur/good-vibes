import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { diffJson } from "diff";
import isEqual from "lodash/isEqual";
import Context, { type Resolve } from "./Context";
import log, { LogLevel } from "./log";
import { errorMessage, formatValue } from "./util";

const DEFAULT_SNAPSHOTS_DIRECTORY = "test/__snapshots__";

// Prefix every line so the diff can still be read when colors are disabled
const prefixLines = (value: string, prefix: string) =>
  value
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");

/**
 * Context passed to tests. Adds assertions on top of `log` and `done`.
 */
export default class TestContext extends Context {
  readonly snapshotsDirectory: string;
  #passedAssertions = 0;
  #failedAssertions = 0;

  constructor(
    testName: string,
    groupName: string,
    resolve: Resolve,
    snapshotsDirectory?: string,
  ) {
    super(testName, resolve);
    this.snapshotsDirectory = path.join(
      snapshotsDirectory ?? DEFAULT_SNAPSHOTS_DIRECTORY,
      groupName,
    );
  }

  #fail(message: string) {
    this.#failedAssertions++;
    this.logger(message, LogLevel.ERROR);
  }

  /**
   * Asserts that `actualValue` deeply equals `expectedValue`, using lodash's `isEqual`.
   */
  check<Type>(expectedValue: Type, actualValue: Type): this {
    if (isEqual(expectedValue, actualValue)) {
      this.#passedAssertions++;
    } else {
      const assertion = this.#passedAssertions + this.#failedAssertions + 1;
      this.#fail(
        `Assertion ${assertion}: Expected ${formatValue(expectedValue)} to match ${formatValue(actualValue)}`,
      );
    }
    return this;
  }

  #getSnapshotPath(assertionName: string): string {
    return path.join(
      this.snapshotsDirectory,
      `${this.name}_${assertionName}.json`,
    );
  }

  async #writeSnapshot(snapshotPath: string, value: unknown) {
    this.logger(`Writing snapshot baseline to ${snapshotPath}`);
    try {
      await mkdir(path.dirname(snapshotPath), { recursive: true });
      await writeFile(snapshotPath, `${JSON.stringify(value, null, 2)}\n`);
    } catch (error) {
      this.logger(
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
      this.#fail(
        `Snapshot ${assertionName}: FAILED as the rebase flag is set, remove it once the baseline is updated`,
      );
      return this;
    }

    let baseline: unknown;
    try {
      baseline = JSON.parse(await readFile(snapshotPath, "utf8"));
    } catch (error) {
      this.#fail(
        `Snapshot ${assertionName}: FAILED as the baseline at ${snapshotPath} could not be read (${errorMessage(error)}). Set the rebase flag to true to create it`,
      );
      return this;
    }

    const changes = diffJson(baseline as object, actualValue as object);
    if (!changes.some((change) => change.added || change.removed)) {
      this.#passedAssertions++;
      this.logger(`Snapshot ${assertionName}: PASSED`, LogLevel.SUCCESS);
      return this;
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
   * Marks the test as complete. The test passes if none of its assertions failed.
   */
  override done(): void {
    const total = this.#passedAssertions + this.#failedAssertions;
    if (total) {
      this.logger(
        `${this.#passedAssertions}/${total} Assertions PASSED`,
        this.#failedAssertions ? LogLevel.ERROR : LogLevel.SUCCESS,
      );
    }
    this.resolve(this.#failedAssertions === 0);
  }
}
