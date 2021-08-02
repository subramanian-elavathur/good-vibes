const { test } = require("../lib/index");

test(
  "Show me love",
  () => {
    throw new Error("I keep on fallin");
  },
  "Failing Tests"
);

test(
  "Underdog",
  (v) => {
    v.check(true).equals(true).done();
  },
  "Failing Tests"
);
