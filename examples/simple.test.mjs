import { test } from "good-vibes";

test("Gramercy Park", (ctx) => {
  setTimeout(() => {
    ctx.log("Just good vibes");
    ctx
      // context.check performs a deep equality check using lodash's isEqual
      .check({ a: { b: 2, c: [1, 2, 3, 4] } }, { a: { b: 2, c: [1, 2, 3, 4] } })
      .done();
  }, 2000);
});

test("Fallin", (ctx) => {
  setTimeout(() => {
    ctx.check(true, true).done();
  });
});

// Tests can be async functions too, just don't forget to call done()
test("If I Ain't Got You", async (ctx) => {
  const value = await Promise.resolve("you");
  ctx.check("you", value).done();
});
