import { TestResult } from ".";
import * as fs from "fs/promises";

const DEFAULT_OUTPUT_DIRECTORY = "test-results";
const TAP_VERSION_DECLARATION = "TAP version 13";
const TAP_PLAN_PREFIX = "1..";
const TAP_OK = "ok";
const TAP_NOT_OK = "not ok";

export default class SimpleTAPReporter {
  private outputDirectory: string;
  private resultsBuffer: Record<string, TestResult[]>;
  private logger: (message: string) => void;

  constructor(outputDirectory?: string) {
    this.outputDirectory = outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY;
    this.resultsBuffer = {};
    this.logger = (message) => console.log(`Test Results Reporter: ${message}`);
  }

  add(groupName: string, results: TestResult[]) {
    this.resultsBuffer[groupName] = results;
  }

  private async initDirectory() {
    let stat;
    try {
      stat = await fs.stat(this.outputDirectory);
    } catch (e) {
      this.logger(
        `Test results directory does not exist, trying to create now`
      );
      try {
        await fs.mkdir(this.outputDirectory, { recursive: true });
        this.logger(`Test results directory created, lets go!`);
      } catch (e) {
        throw new Error(
          `Failed to create test results directory due to error: ${e}`
        );
      }
    }
    if (stat) {
      if (!stat.isDirectory()) {
        throw new Error(
          `Specified path for test results (${this.outputDirectory}) exists but is not a directory`
        );
      } else {
        this.logger(`Directory already exists, lets go!`);
      }
    }
  }

  async report() {
    this.logger(`Writing test results report`);
    await this.initDirectory();
    for (const group in this.resultsBuffer) {
      const results = this.resultsBuffer[group];
      if (!results?.length) {
        this.logger(`Skipping group: ${group} as no test results found for it`);
        continue;
      }
      const output = results.reduce((acc, each, index) => {
        return `${acc}\n${each.status ? TAP_OK : TAP_NOT_OK} ${index + 1} ${
          each.name
        }`;
      }, `${TAP_VERSION_DECLARATION}\n${TAP_PLAN_PREFIX}${results.length}`);
      await fs.writeFile(
        `${this.outputDirectory}/${group
          .replace(/\s+/g, "-")
          .toLowerCase()}.tap`,
        output
      );
    }
    this.logger(`Test results report written successfully\n`);
  }
}
