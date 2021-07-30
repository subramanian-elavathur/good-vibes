const { before, test, after } = require("../lib/index");

// Groups are just strings that group together a set of related tests
// Using groups allows you to specify before and after methods as described below
const TASH_SULTANA = "Tash Sultana";

let numbers;
let strings;

// If you need to perform actions before your tests start running, you may perform them here
// Once you are done with the setup, you must call done()
before((done, log) => {
  log("Here is an example where we set a value synchronously");
  numbers = [1, 2, 3, 4, 5];
  log("And here we have an asynchronous example");
  setTimeout(() => {
    log("This log prints after 2 seconds");
    strings = ["this", "value", "is", "set", "after", "2", "seconds"];
    done(); // dont forget to call done :)
  }, 2000);
}, TASH_SULTANA);

// lets write our first test

test(
  "Jungle",
  (verify) => {
    verify
      .check(5)
      .equals(numbers.length)
      .check("1,2,3,4,5")
      .equals(numbers.join(","))
      .done();
  },
  TASH_SULTANA
);

test(
  "Notion",
  (verify) => {
    verify
      .check(7)
      .equals(strings.length)
      .check("this value is set after 2 seconds")
      .equals(strings.join(" "))
      .done();
  },
  TASH_SULTANA
);

after((done, log) => {
  log(
    "In the after method you may perform any cleanup you like. Its useful to reset state of global variables if you changed them."
  );
  numbers = undefined;
  strings = undefined;
  done();
}, TASH_SULTANA); // group name is important so dont forget it :)
