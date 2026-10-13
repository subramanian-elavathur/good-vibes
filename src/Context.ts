import log, { type LogLevel } from "./log";

export interface Logger {
  (message: string, level?: LogLevel): void;
}

const createLogger =
  (name: string): Logger =>
  (message: string, level?: LogLevel) =>
    log(`Log: ${name}: ${message}`, level);

export interface Resolve {
  (result: boolean): void;
}

/**
 * Context passed to `before` and `after` scripts.
 */
export default class Context {
  readonly name: string;
  readonly resolve: Resolve;
  readonly logger: Logger;

  constructor(name: string, resolve: Resolve) {
    this.name = name;
    this.resolve = resolve;
    this.logger = createLogger(name);
  }

  /**
   * Logs a message prefixed with the name of the test or script.
   */
  log(message: string): void {
    this.logger(message);
  }

  /**
   * Marks the test or script as complete.
   */
  done(): void {
    this.resolve(true);
  }
}
