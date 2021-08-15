const { test } = require("../lib/index");

test("Pink Moon", async (verify, log) => {
  const data = {
    a: 1,
    b: "string",
    c: [1, 2, 3, 4],
    d: { a: 1, c: [1, 2, 3, 4] },
  };
  await verify.snapshot("Pink Moon", data);
  verify.done();
});
