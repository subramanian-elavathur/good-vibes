#!/usr/bin/env node
// The good-vibes command: finds test files and runs each in a child process
import { fork } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { glob } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import log, { colorsEnabled, LogLevel } from "./log";
import { printBanner, printSummary, type RunError } from "./report";
import {
  calculateExecutionTime,
  DEFAULT_TEST_TIMEOUT,
  type RunnerOptions,
  type RunOutcome,
} from "./runner";
import { errorMessage } from "./util";

const TEST_FILES = "**/*.test.{js,mjs,cjs,ts,mts,cts}";

const USAGE = `Usage: good-vibes [options] [patterns...]

Runs the test files matching the glob patterns, each in its own process.
A directory runs the test files in it. Patterns default to "${TEST_FILES}".
node_modules directories are never searched.

Options:
  --timeout <ms>         Timeout for each test, before and after script
                         (default: ${DEFAULT_TEST_TIMEOUT}, 0 disables it)
  --concurrency <n>      Number of test files to run at the same time
                         (default: number of CPUs minus one)
  --grep <pattern>       Only run tests whose name, or the name of one of
                         their groups, matches the regular expression
  --snapshots-dir <dir>  Directory of snapshot baselines
                         (default: test/__snapshots__)
  -h, --help             Show this help
  -v, --version          Show the version number

Examples:
  good-vibes "test/**/*.test.ts"
  good-vibes --timeout 5000 test/users.test.ts`;

class UsageError extends Error {}

const isUsageError = (error: unknown) =>
  error instanceof UsageError ||
  (error instanceof TypeError &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("ERR_PARSE_ARGS"));

const parseWholeNumber = (
  value: string | undefined,
  name: string,
  minimum: number,
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum) {
    throw new UsageError(
      `--${name} must be a whole number of at least ${minimum}, got "${value}"`,
    );
  }
  return number;
};

const parseCommandLine = (args: string[]) => {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      timeout: { type: "string" },
      concurrency: { type: "string" },
      grep: { type: "string" },
      "snapshots-dir": { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
  if (values.grep !== undefined) {
    try {
      new RegExp(values.grep);
    } catch (error) {
      throw new UsageError(`--grep is invalid: ${errorMessage(error)}`);
    }
  }
  const options: RunnerOptions = {
    testTimeout: parseWholeNumber(values.timeout, "timeout", 0),
    grep: values.grep,
    snapshotsDirectory: values["snapshots-dir"],
  };
  return {
    help: values.help === true,
    version: values.version === true,
    patterns: positionals.length ? positionals : [TEST_FILES],
    concurrency:
      parseWholeNumber(values.concurrency, "concurrency", 1) ??
      Math.max(availableParallelism() - 1, 1),
    options,
  };
};

const isDirectory = (pattern: string) => {
  try {
    return statSync(pattern).isDirectory();
  } catch {
    return false;
  }
};

const findTestFiles = async (patterns: string[]): Promise<string[]> => {
  const files = new Set<string>();
  const globPatterns = patterns.map((pattern) =>
    isDirectory(pattern) ? path.join(pattern, TEST_FILES) : pattern,
  );
  for await (const entry of glob(globPatterns, {
    withFileTypes: true,
    exclude: (entry) => entry.name === "node_modules",
  })) {
    if (entry.isFile()) {
      files.add(
        path.relative(process.cwd(), path.join(entry.parentPath, entry.name)),
      );
    }
  }
  return [...files].sort();
};

interface FileRun {
  file: string;
  outcome?: RunOutcome;
  failure?: string;
  output: [NodeJS.WriteStream, Buffer][];
}

const WORKER = path.join(__dirname, "worker.js");

// Children write to pipes, so they are told to use colors when we do
const childEnvironment = (): NodeJS.ProcessEnv =>
  colorsEnabled() && process.env.FORCE_COLOR === undefined
    ? { ...process.env, FORCE_COLOR: "1" }
    : process.env;

const runFile = (
  file: string,
  options: RunnerOptions,
  streamOutput: boolean,
): Promise<FileRun> =>
  new Promise((resolve) => {
    const run: FileRun = { file, output: [] };
    const child = fork(WORKER, [file, JSON.stringify(options)], {
      env: childEnvironment(),
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    const forward = (target: NodeJS.WriteStream) => (chunk: Buffer) => {
      if (streamOutput) {
        target.write(chunk);
      } else {
        run.output.push([target, chunk]);
      }
    };
    child.stdout?.on("data", forward(process.stdout));
    child.stderr?.on("data", forward(process.stderr));
    child.on("message", (message) => {
      run.outcome = message as RunOutcome;
    });
    child.on("error", (error) => {
      run.failure = `Could not run the test file: ${errorMessage(error)}`;
      resolve(run);
    });
    child.on("close", (code, signal) => {
      if (!run.outcome) {
        run.failure ??= signal
          ? `The test file was terminated by ${signal}`
          : `The test file exited with return code ${code} before reporting its results`;
      }
      resolve(run);
    });
  });

// Output of a file is printed once it finishes, unless only one file runs at
// a time, so the output of files running in parallel is not interleaved
const runFiles = async (
  files: string[],
  options: RunnerOptions,
  concurrency: number,
): Promise<FileRun[]> => {
  const streamOutput = concurrency === 1 || files.length === 1;
  const queue = [...files];
  const runs: FileRun[] = [];
  const runNext = async (): Promise<void> => {
    const file = queue.shift();
    if (file === undefined) {
      return;
    }
    if (streamOutput) {
      log(`Running tests in ${file}\n`);
    }
    const run = await runFile(file, options, streamOutput);
    if (!streamOutput) {
      log(`Running tests in ${file}\n`);
      for (const [target, chunk] of run.output) {
        target.write(chunk);
      }
    }
    runs.push(run);
    return runNext();
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, files.length) }, runNext),
  );
  return runs.sort((a, b) => files.indexOf(a.file) - files.indexOf(b.file));
};

const modeOf = (runs: FileRun[]): RunOutcome["mode"] => {
  const modes = new Set(runs.map((run) => run.outcome?.mode));
  return modes.has("debug") ? "debug" : modes.has("only") ? "only" : "normal";
};

// Returns the exit code
const main = async (args: string[]): Promise<number> => {
  let command: ReturnType<typeof parseCommandLine>;
  try {
    command = parseCommandLine(args);
  } catch (error) {
    if (isUsageError(error)) {
      console.error(`good-vibes: ${errorMessage(error)}\n\n${USAGE}`);
      return 1;
    }
    throw error;
  }
  if (command.help) {
    console.log(USAGE);
    return 0;
  }
  if (command.version) {
    const packageJson = readFileSync(
      path.join(__dirname, "..", "package.json"),
      "utf8",
    );
    console.log((JSON.parse(packageJson) as { version: string }).version);
    return 0;
  }

  printBanner();
  const startTime = performance.now();
  const files = await findTestFiles(command.patterns);
  if (!files.length) {
    log(
      `No test files found matching ${command.patterns
        .map((pattern) => `"${pattern}"`)
        .join(", ")}`,
      LogLevel.ERROR,
    );
    return 1;
  }

  const runs = await runFiles(files, command.options, command.concurrency);
  const results = runs.flatMap(({ file, outcome }) =>
    (outcome?.results ?? []).map((result) => ({ ...result, file })),
  );
  const scriptFailures = runs.flatMap(({ file, outcome }) =>
    (outcome?.scriptFailures ?? []).map((result) => ({ ...result, file })),
  );
  const errors: RunError[] = runs.flatMap(({ file, outcome, failure }) =>
    [...(outcome?.errors ?? []), ...(failure ? [failure] : [])].map(
      (message) => ({ file, message }),
    ),
  );
  for (const { file, outcome } of runs) {
    if (outcome && !outcome.results.length && !outcome.errors.length) {
      log(`No tests found in ${file}`, LogLevel.ERROR);
    }
  }
  log(
    `Ran ${results.length} tests from ${files.length} files in ${calculateExecutionTime(
      startTime,
      performance.now(),
    )} seconds\n`,
  );
  return printSummary({
    results,
    scriptFailures,
    errors,
    mode: modeOf(runs),
  })
    ? 0
    : 1;
};

main(process.argv.slice(2)).then(
  (exitCode) => {
    process.exitCode = exitCode;
  },
  (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  },
);
