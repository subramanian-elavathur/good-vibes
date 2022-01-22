import { test } from "../src";

test("Gramercy Park", (ctx) => {
  setTimeout(() => {
    ctx.log("Just good vibes");
    ctx
      // context.check performs a deep equality check using lodash.isequal package
      .check({ a: { b: 2, c: [1, 2, 3, 4] } }, { a: { b: 2, c: [1, 2, 3, 4] } })
      .done();
  }, 2000);
});

test("Fallin", (ctx) => {
  setTimeout(() => {
    ctx.check(true, true).done();
  });
});
