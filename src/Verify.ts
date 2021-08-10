import { Logger } from "./index";
import * as isEqual from "lodash.isequal";

interface Resolve {
  (result: boolean): void;
}

enum TestStatus {
  FAILED,
  PASSED,
}

export default class Verify {
  #resolve: Resolve;
  #testStatus: TestStatus;
  #logger: Logger;

  constructor(resolve: Resolve, logger: Logger) {
    this.#resolve = resolve;
    this.#logger = logger;
  }

  check<Type>(expectedValue: Type, actualValue: Type): Verify {
    const result = isEqual(expectedValue, actualValue);
    if (!result) {
      this.#logger(`Expected ${expectedValue} to match ${actualValue}`);
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
