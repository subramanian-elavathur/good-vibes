import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TestResult } from "./index";
import log from "./log";

const DEFAULT_OUTPUT_DIRECTORY = "test-results";
const TAP_VERSION_DECLARATION = "TAP version 13";

const reporterLog = (message: string) =>
  log(`Test Results Reporter: ${message}`);

// "#" starts a directive (e.g. "# SKIP") in TAP so it must be escaped
const escapeDescription = (name: string) => name.replace(/#/g, "\\#");

const toFileName = (group: string) =>
  `${group.replace(/[\s/\\]+/g, "-").toLowerCase()}.tap`;

const toTestPoint = (result: TestResult, index: number) => {
  const testPoint = `${result.status ? "ok" : "not ok"} ${index + 1} ${escapeDescription(result.name)}`;
  // JSON strings are valid YAML, which keeps the diagnostic block well formed
  return result.message === undefined
    ? testPoint
    : `${testPoint}\n  ---\n  message: ${JSON.stringify(result.message)}\n  ...`;
};

export default class SimpleTAPReporter {
  readonly outputDirectory: string;
  readonly #results = new Map<string, TestResult[]>();

  constructor(outputDirectory?: string) {
    this.outputDirectory = outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY;
  }

  add(groupName: string, results: TestResult[]): void {
    this.#results.set(groupName, results);
  }

  async report(): Promise<void> {
    reporterLog(`Writing test results report to ${this.outputDirectory}`);
    await mkdir(this.outputDirectory, { recursive: true });
    for (const [group, results] of this.#results) {
      const output = [
        TAP_VERSION_DECLARATION,
        `1..${results.length}`,
        ...results.map(toTestPoint),
      ].join("\n");
      await writeFile(
        path.join(this.outputDirectory, toFileName(group)),
        `${output}\n`,
      );
    }
    reporterLog(`Test results report written successfully\n`);
  }
}
