// Runs a single test file in a child process of the good-vibes command and
// sends the results back to it over IPC. Usage: worker.js <file> <options>
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inspect } from "node:util";
import log, { LogLevel } from "./log";
import {
  runRegisteredTests,
  setManagedByCli,
  type RunnerOptions,
  type RunOutcome,
} from "./runner";
import { errorMessage, flushAndExit, formatError } from "./util";

const sendToParent = (outcome: RunOutcome) =>
  new Promise<void>((resolve) => {
    if (process.send) {
      process.send(outcome, () => resolve());
    } else {
      resolve();
    }
  });

const runFile = async (file: string, options: RunnerOptions) => {
  // Test files written for good-vibes 1.x call run() themselves, which now
  // does nothing
  setManagedByCli();
  try {
    await import(pathToFileURL(path.resolve(file)).href);
  } catch (error) {
    log(`Failed to load ${file}: ${formatError(error)}`, LogLevel.ERROR);
    await sendToParent({
      results: [],
      scriptFailures: [],
      errors: [`Failed to load test file: ${errorMessage(error)}`],
      mode: "normal",
    });
    return;
  }
  await sendToParent(await runRegisteredTests(options));
};

const [file, serializedOptions = "{}"] = process.argv.slice(2);

runFile(file, JSON.parse(serializedOptions) as RunnerOptions).then(
  () => flushAndExit(0),
  (error: unknown) => {
    log(`Good vibes failed unexpectedly: ${inspect(error)}`, LogLevel.ERROR);
    flushAndExit(1);
  },
);
