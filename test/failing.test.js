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
  (ctx) => {
    ctx.check(true, false);
    ctx.log("lets assert a passing test");
    ctx.check(true, true);
    ctx.log("This test should still fail");
    ctx.done();
  },
  "Failing Tests"
);
