import log from "./log";
interface Logger {
  (message: string): void;
}

const createLogger =
  (name: string): Logger =>
  (message) =>
    log(`Log: ${name}: ${message}`);

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
