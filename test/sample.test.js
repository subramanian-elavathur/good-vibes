const { test } = require("../lib/index");

test("Gramercy Park", (check, log) => {
  setTimeout(() => {
    log("Just good vibes");
    check(true, false);
  }, 2000);
});

test("Fallin", (check) => {
  setTimeout(() => {
    check(true, true);
  }, 2000);
});

test("Show me love", () => {
  throw new Error("I keep on fallin");
});

test("Underdog", (check) => {
  check(true, true);
});
