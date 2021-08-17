import { Logger } from "./index";
import * as isEqual from "lodash.isequal";
import * as fs from "fs/promises";
import * as Diff from "diff";

interface Resolve {
  (result: boolean): void;
}

enum TestStatus {
  FAILED,
  PASSED,
}

export default class Verify {
  #resolve: Resolve;
  #testStatus: TestStatus;
  #logger: Logger;
  #checkpointsDirectory: string;
  #checkpointsDirectoryInitCompleted: boolean;
  #checkpointsDirectoryInitFailed: boolean;

  constructor(resolve: Resolve, logger: Logger) {
    this.#resolve = resolve;
    this.#logger = logger;
    this.#checkpointsDirectory = "./__snapshots__"; // todo: make configurable
    this.#checkpointsDirectoryInitCompleted = false;
    this.#checkpointsDirectoryInitFailed = false;
  }

  check<Type>(expectedValue: Type, actualValue: Type): Verify {
    const result = isEqual(expectedValue, actualValue);
    if (!result) {
      this.#logger(`Expected ${expectedValue} to match ${actualValue}`);
      this.#testStatus = TestStatus.FAILED;
    } else {
      this.#testStatus = TestStatus.PASSED;
    }
    return this;
  }

  async #initSnapshotsDirectory() {
    if (this.#checkpointsDirectoryInitCompleted) {
      return; // no need to re-init
    }
    if (this.#checkpointsDirectoryInitFailed) {
      this.#logger(
        `Failed to create snapshots directory in a previous attempt, will not retry`
      );
      return; // no need to re-init
    }
    this.#logger(
      `Checking if specified directory for snapshots ${
        this.#checkpointsDirectory
      } exists`
    );
    let stat;
    try {
      stat = await fs.stat(this.#checkpointsDirectory);
    } catch (e) {
      this.#logger(`Snapshots directory does not exist, trying to create now`);
      try {
        await fs.mkdir(this.#checkpointsDirectory, { recursive: true });
        this.#logger(`Snapshots directory created, lets go!`);
        this.#checkpointsDirectoryInitCompleted = true;
      } catch (e) {
        this.#logger(`Failed to create snapshots directory due to error: ${e}`);
        this.#checkpointsDirectoryInitFailed = true;
      }
    }
    if (stat) {
      if (!stat.isDirectory()) {
        this.#logger(
          `Specified path for snapshots (${
            this.#checkpointsDirectory
          }) exists but is not a directory`
        );
        this.#checkpointsDirectoryInitFailed = true;
      } else {
        console.log(`Directory already exists, lets go!`);
        this.#checkpointsDirectoryInitCompleted = true;
      }
    }
  }

  #getSnapshotPath(assertionName: string): string {
    return `${this.#checkpointsDirectory}/${assertionName}.json`;
  }

  async snapshot<Type>(
    assertionName: string,
    actualValue: Type,
    rebase?: boolean
  ): Promise<Verify> {
    if (rebase) {
      await this.#initSnapshotsDirectory();
      this.#logger(
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
        this.#logger(
          `Failed to write snapshot baseline file due to error, ${e}`
        );
      }
      this.#logger(`Failing test in case rebase flag was set by mistake`);
      this.#testStatus = TestStatus.FAILED;
    } else {
      const snapshotPath = this.#getSnapshotPath(assertionName);
      let data;
      try {
        data = await fs.readFile(snapshotPath, {
          encoding: "utf8",
        });
      } catch (e) {
        this.#logger(`Could not find snapshot file at path ${snapshotPath}`);
        this.#testStatus = TestStatus.FAILED;
        return Promise.resolve(this);
      }
      const existingValue = JSON.parse(data);
      const diff = Diff.diffJson(existingValue, actualValue);
      if (diff?.length) {
        let failed = diff.reduce((failed, part) => {
          failed = failed || part.added || part.removed;
          return failed;
        }, false);
        if (failed) {
          this.#logger("Test failed, please see diff below for details\n");
          diff.forEach((part) => {
            const color = part.added
              ? "\x1b[32m" // green
              : part.removed
              ? "\x1b[31m" // red
              : "\x1b[0m";
            console.log(`${color}%s\x1b[0m`, part.value);
          });
          this.#testStatus = TestStatus.FAILED;
        } else {
          this.#testStatus = TestStatus.PASSED;
        }
      } else {
        this.#logger(
          "Test failed as baseline was empty, run with rebase flag set to true to generate file"
        );
        this.#testStatus = TestStatus.FAILED;
      }
    }
    return Promise.resolve(this);
  }

  done() {
    this.#resolve(this.#testStatus === TestStatus.PASSED);
  }
}
