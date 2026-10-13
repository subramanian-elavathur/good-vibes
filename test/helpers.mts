import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TestContext } from "node:test";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../", import.meta.url));

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Passed to `run()` by fixtures that import `./options.mjs` */
  options?: Record<string, unknown>;
}

/**
 * Runs a script (relative to the repository root) in a child process. Each run
 * needs its own process because good-vibes exits once the tests finish.
 */
export const runScript = (
  script: string,
  { cwd = ROOT, env = {}, options = {} }: RunOptions = {},
): Promise<RunResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, script)], {
      cwd,
      env: {
        ...process.env,
        NO_COLOR: "1",
        GOOD_VIBES_OPTIONS: JSON.stringify(options),
        ...env,
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });

/**
 * Creates a temporary directory that is removed once the test finishes.
 */
export const makeTempDir = async (t: TestContext): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), "good-vibes-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
};

/**
 * Returns the index of the first line of `output` that starts with `match` (or
 * matches it, when it is a RegExp), failing if there is none. Useful to assert
 * the order of events.
 */
export const lineIndex = (output: string, match: string | RegExp): number => {
  const index = output
    .split("\n")
    .findIndex((line) =>
      typeof match === "string" ? line.startsWith(match) : match.test(line),
    );
  if (index === -1) {
    throw new Error(`Expected a line matching ${String(match)} in:\n${output}`);
  }
  return index;
};
