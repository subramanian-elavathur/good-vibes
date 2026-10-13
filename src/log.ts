export const LogLevel = {
  INFO: 0,
  SUCCESS: 1,
  ERROR: 2,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const RESET = "\x1b[0m";
const COLORS: Partial<Record<LogLevel, string>> = {
  [LogLevel.SUCCESS]: "\x1b[32m", // green
  [LogLevel.ERROR]: "\x1b[31m", // red
};

/**
 * Colors are used when stdout is a terminal that supports them. NO_COLOR
 * (https://no-color.org) turns them off and FORCE_COLOR turns them on, e.g.
 * for CI systems that render colors, or for test files the CLI runs in a
 * child process.
 */
export const colorsEnabled = (): boolean => {
  if (process.env.NO_COLOR) {
    return false;
  }
  const forceColor = process.env.FORCE_COLOR;
  if (forceColor !== undefined) {
    return forceColor !== "0" && forceColor !== "false";
  }
  const { stdout } = process;
  return (
    stdout.isTTY === true &&
    typeof stdout.hasColors === "function" &&
    stdout.hasColors()
  );
};

const log = (message: string, level: LogLevel = LogLevel.INFO) => {
  const color = colorsEnabled() ? COLORS[level] : undefined;
  console.log("%s", color ? `${color}${message}${RESET}` : message);
};

export default log;
