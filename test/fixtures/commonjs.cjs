const { test, run } = require("good-vibes");

test("Works with require", (ctx) => {
  ctx.check([1, 2], [1, 2]).done();
});

run();
