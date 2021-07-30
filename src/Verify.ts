import { Logger } from "./index";

interface Resolve {
  (result: boolean): void;
}

enum TestStatus {
  STARTED,
  FAILED,
  PASSED,
}

export default class Verify {
  #resolve: Resolve;
  #testStatus: TestStatus;
  #logger: Logger;
  #expectedValue: any;

  constructor(resolve: Resolve, logger: Logger) {
    this.#resolve = resolve;
    this.#logger = logger;
  }

  check(expectedValue: any): Verify {
    this.#expectedValue = expectedValue;
    return this;
  }

  equals(actualValue: any): Verify {
    const result = this.#expectedValue === actualValue;
    if (!result) {
      this.#logger(`Expected ${this.#expectedValue} to match ${actualValue}`);
      this.#testStatus = TestStatus.FAILED;
    } else {
      this.#testStatus = TestStatus.PASSED;
    }
    return this;
  }

  done() {
    this.#resolve(this.#testStatus === TestStatus.PASSED);
  }
}
