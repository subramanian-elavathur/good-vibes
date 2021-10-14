import * as isEqual from "lodash.isequal";
import * as fs from "fs/promises";
import * as Diff from "diff";
import Context, { Resolve } from "./Context";
import log, { LogLevel } from "./log";

enum TestStatus {
  PASSTHROUGH,
  FAILED,
  PASSED,
}

export default class TestContext extends Context {
  #groupName: string;
  #testStatus: TestStatus;
  readonly snapshotsDirectory: string;
  #snapshotsDirectoryInitCompleted: boolean;
  #snapshotsDirectoryInitFailed: boolean;

  constructor(
    testName: string,
    groupName: string,
    resolve: Resolve,
    snapshotsDirectory?: string
  ) {
    super(testName, resolve);
    this.#groupName = groupName;
    this.snapshotsDirectory = snapshotsDirectory
      ? `${snapshotsDirectory}/${this.#groupName}`
      : `./test/__snapshots__/${this.#groupName}`;
    this.#snapshotsDirectoryInitCompleted = false;
    this.#snapshotsDirectoryInitFailed = false;
    this.#testStatus = TestStatus.PASSTHROUGH;
  }

  check<Type>(expectedValue: Type, actualValue: Type): TestContext {
    const result = isEqual(expectedValue, actualValue);
    if (!result) {
      this.logger(
        `Expected ${JSON.stringify(expectedValue)} to match ${JSON.stringify(
          actualValue
        )}`
      );
      this.#testStatus = TestStatus.FAILED;
    } else {
      this.#testStatus = TestStatus.PASSED;
    }
    return this;
  }

  async #initSnapshotsDirectory() {
    if (this.#snapshotsDirectoryInitCompleted) {
      return; // no need to re-init
    }
    if (this.#snapshotsDirectoryInitFailed) {
      this.logger(
        `Failed to create snapshots directory in a previous attempt, will not retry`
      );
      return; // no need to re-init
    }
    this.logger(
      `Checking if specified directory for snapshots ${this.snapshotsDirectory} exists`
    );
    let stat;
    try {
      stat = await fs.stat(this.snapshotsDirectory);
    } catch (e) {
      this.logger(`Snapshots directory does not exist, trying to create now`);
      try {
        await fs.mkdir(this.snapshotsDirectory, { recursive: true });
        this.logger(`Snapshots directory created, lets go!`);
        this.#snapshotsDirectoryInitCompleted = true;
      } catch (e) {
        this.logger(`Failed to create snapshots directory due to error: ${e}`);
        this.#snapshotsDirectoryInitFailed = true;
      }
    }
    if (stat) {
      if (!stat.isDirectory()) {
        this.logger(
          `Specified path for snapshots (${this.snapshotsDirectory}) exists but is not a directory`
        );
        this.#snapshotsDirectoryInitFailed = true;
      } else {
        log(`Directory already exists, lets go!`);
        this.#snapshotsDirectoryInitCompleted = true;
      }
    }
  }

  #getSnapshotPath(assertionName: string): string {
    return `${this.snapshotsDirectory}/${this.name}_${assertionName}.json`;
  }

  async snapshot<Type>(
    assertionName: string,
    actualValue: Type,
    rebase?: boolean
  ): Promise<TestContext> {
    if (rebase) {
      await this.#initSnapshotsDirectory();
      this.logger(
        `Writing snapshot baseline for ${assertionName} to ${this.#getSnapshotPath(
          assertionName
        )}`
      );
      try {
        await fs.writeFile(
          this.#getSnapshotPath(assertionName),
          JSON.stringify(actualValue)
        );
      } catch (e) {
        this.logger(
          `Failed to write snapshot baseline file due to error, ${e}`
        );
      }
      this.logger(`Failing test in case rebase flag was set by mistake`);
      this.#testStatus = TestStatus.FAILED;
    } else {
      const snapshotPath = this.#getSnapshotPath(assertionName);
      let data;
      try {
        data = await fs.readFile(snapshotPath, {
          encoding: "utf8",
        });
      } catch (e) {
        this.logger(`Could not find snapshot file at path ${snapshotPath}`);
        this.#testStatus = TestStatus.FAILED;
        return Promise.resolve(this);
      }
      const existingValue = JSON.parse(data);
      const diff = Diff.diffJson(actualValue, existingValue);
      if (diff?.length) {
        let failed = diff.reduce((failed, part) => {
          failed = failed || part.added || part.removed;
          return failed;
        }, false);
        if (failed) {
          this.logger("Test failed, please see diff below for details\n");
          diff.forEach((part) => {
            log(
              part.value,
              part.added
                ? LogLevel.SUCCESS
                : part.removed
                ? LogLevel.ERROR
                : LogLevel.INFO
            );
          });
          this.#testStatus = TestStatus.FAILED;
        } else {
          this.#testStatus = TestStatus.PASSED;
        }
      } else {
        this.logger(
          "Test failed as baseline was empty, run with rebase flag set to true to generate file"
        );
        this.#testStatus = TestStatus.FAILED;
      }
    }
    return Promise.resolve(this);
  }

  done() {
    this.resolve(
      this.#testStatus === TestStatus.PASSTHROUGH ||
        this.#testStatus === TestStatus.PASSED
    );
  }
}
