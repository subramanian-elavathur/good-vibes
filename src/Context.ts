import log, { LogLevel } from "./log";
interface Logger {
  (message: string, level?: LogLevel): void;
}

const createLogger =
  (name: string): Logger =>
  (message: string, level?: LogLevel) =>
    log(`Log: ${name}: ${message}`, level);

export interface Resolve {
  (result: boolean): void;
}

export default class Context {
  readonly name: string;
  readonly resolve: Resolve;
  readonly logger: Logger;

  constructor(name: string, resolve: Resolve) {
    this.name = name;
    this.resolve = resolve;
    this.logger = createLogger(name);
  }

  log(message: string) {
    this.logger(message);
  }

  done() {
    this.resolve(true);
  }
}
