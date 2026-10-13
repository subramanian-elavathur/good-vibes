import log, { LogLevel } from "./log";

export type Finish = (passed: boolean, failure?: string) => void;

/**
 * Context passed to `before` and `after` scripts.
 */
export default class Context {
  /** Name of the test or script */
  readonly name: string;
  readonly #finish: Finish;
  #finished = false;

  constructor(name: string, finish: Finish) {
    this.name = name;
    this.#finish = finish;
  }

  protected logWithLevel(message: string, level: LogLevel): void {
    log(`Log: ${this.name}: ${message}`, level);
  }

  /**
   * Logs a message prefixed with the name of the test or script.
   */
  log(message: string): void {
    this.logWithLevel(message, LogLevel.INFO);
  }

  /**
   * Returns true the first time it is called, so the result is only reported once.
   */
  protected markFinished(): boolean {
    if (this.#finished) {
      return false;
    }
    this.#finished = true;
    return true;
  }

  protected finish(passed: boolean, failure?: string): void {
    this.#finish(passed, failure);
  }

  /**
   * Marks the script as complete. Only needed when it is not an `async`
   * function but takes the context parameter, e.g. when it completes in a
   * callback.
   */
  done(): void {
    if (this.markFinished()) {
      this.finish(true);
    }
  }
}
