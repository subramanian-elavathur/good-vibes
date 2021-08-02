const { test } = require("../lib/index");

test("Gramercy Park", (verify, log) => {
  setTimeout(() => {
    log("Just good vibes");
    verify.check(1).equals(1).done();
  }, 2000);
});

test("Fallin", (v) => {
  setTimeout(() => {
    v.check(true).equals(true).done();
  });
});
