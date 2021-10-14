export enum LogLevel {
  INFO,
  SUCCESS,
  ERROR,
}

const log = (message: string, level: LogLevel = LogLevel.INFO) => {
  const color =
    level === LogLevel.SUCCESS
      ? "\x1b[32m" // green
      : level === LogLevel.ERROR
      ? "\x1b[31m" // red
      : "\x1b[0m";
  console.log(`${color}%s\x1b[0m`, message);
};

export default log;
