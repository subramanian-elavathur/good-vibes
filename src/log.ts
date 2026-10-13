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

// Respect the NO_COLOR convention, see https://no-color.org
const colorsEnabled = () => !process.env.NO_COLOR;

const log = (message: string, level: LogLevel = LogLevel.INFO) => {
  const color = colorsEnabled() ? COLORS[level] : undefined;
  console.log("%s", color ? `${color}${message}${RESET}` : message);
};

export default log;
