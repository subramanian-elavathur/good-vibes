const { test } = require("../lib/index");

test("Gramercy Park", (verify, log) => {
  setTimeout(() => {
    log("Just good vibes");
    verify.check(true).equals(false).done();
  }, 2000);
});

test("Fallin", (v) => {
  setTimeout(() => {
    v.check(true).equals(true).done();
  });
});

test("Show me love", () => {
  throw new Error("I keep on fallin");
});

test("Underdog", (v) => {
  v.check(true).equals(true).done();
});
