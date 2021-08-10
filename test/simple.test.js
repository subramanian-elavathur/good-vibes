const { test } = require("../lib/index");

test("Gramercy Park", (verify, log) => {
  setTimeout(() => {
    log("Just good vibes");
    verify
      // verify.check performs a deep equality check using lodash.isequal package
      .check({ a: { b: 2, c: [1, 2, 3, 4] } }, { a: { b: 2, c: [1, 2, 3, 4] } })
      .done();
  }, 2000);
});

test("Fallin", (v) => {
  setTimeout(() => {
    v.check(true, true).done();
  });
});
