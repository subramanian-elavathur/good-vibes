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
      console.log(
        `Failed to init directory in a previous attempt, will not retry`
      );
      return; // no need to re-init
    }
    console.log(
      `Checking if specified path ${this.#checkpointsDirectory} exists`
    );
    let stat;
    try {
      stat = await fs.stat(this.#checkpointsDirectory);
    } catch (e) {
      console.log(`Directory does not exist - will create`);
      try {
        await fs.mkdir(this.#checkpointsDirectory, { recursive: true });
        console.log(`Directory created, lets go!`);
        this.#checkpointsDirectoryInitCompleted = true;
      } catch (e) {
        console.log(`Failed to create directory due to error: ${e}`);
        this.#checkpointsDirectoryInitFailed = true;
      }
    }
    if (stat) {
      if (!stat.isDirectory()) {
        console.log(
          `Specified path ${
            this.#checkpointsDirectory
          } exists but is not a directory`
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

  async snapshot<Type>( // todo: proper error handling and logging
    assertionName: string,
    actualValue: Type,
    rebase?: boolean
  ): Promise<Verify> {
    if (rebase) {
      await this.#initSnapshotsDirectory();
      this.#logger(
        `Writing baseline for ${assertionName} to ${this.#getSnapshotPath(
          assertionName
        )}`
      );
      await fs.writeFile(
        this.#getSnapshotPath(assertionName),
        JSON.stringify(actualValue)
      );
      this.#logger(`Failing test in case rebase flag was set by mistake`);
      this.#testStatus = TestStatus.FAILED;
    } else {
      const data = await fs.readFile(this.#getSnapshotPath(assertionName), {
        encoding: "utf8",
      });
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
            console.log(
              `${part.added ? "[ADDED]" : part.removed ? "[REMOVED]" : ""} ${
                part.value
              }`
            );
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
