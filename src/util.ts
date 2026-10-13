import path from "node:path";
import { inspect } from "node:util";

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// Assertion errors include a multi-line diff in their message, summaries only
// show the first line
export const firstLine = (message: string): string => message.split("\n", 1)[0];

// Unlike JSON.stringify this handles BigInt, circular references, Maps, Sets, etc.
export const formatValue = (value: unknown): string =>
  inspect(value, { depth: Infinity, breakLength: Infinity });

/**
 * Error thrown when a test or script takes too long. Its stack trace would
 * only point at good-vibes, so it is not logged.
 */
export class TimeoutError extends Error {
  override name = "TimeoutError";
}

const LIBRARY_DIRECTORY = __dirname + path.sep;

const isInternalStackFrame = (line: string) =>
  line.trimStart().startsWith("at ") && line.includes(LIBRARY_DIRECTORY);

/**
 * Formats an error for the logs, without the stack frames of good-vibes itself.
 */
export const formatError = (error: unknown): string =>
  error instanceof TimeoutError
    ? error.message
    : inspect(error)
        .split("\n")
        .filter((line) => !isInternalStackFrame(line))
        .join("\n");

export const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  (typeof value === "object" || typeof value === "function") &&
  value !== null &&
  "then" in value &&
  typeof value.then === "function";

/**
 * Exits once everything written to stdout and stderr has been flushed, which
 * process.exit() alone does not guarantee when they are pipes.
 */
export const flushAndExit = (code: number): void => {
  process.stdout.write("", () => {
    process.stderr.write("", () => process.exit(code));
  });
};
