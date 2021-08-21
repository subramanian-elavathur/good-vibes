const { test } = require("../lib/index");

test("Pink Moon", async (verify, log) => {
  const data = {
    a: 1,
    b: "string",
    c: [1, 2, 3, 4],
    d: { a: 1, c: [1, 2, 3, 4] },
  };
  // Verifying a snapshot is asynchronous operation so dont forget to await its execution
  await verify.snapshot("Blackbird", data);
  // to create snapshot set the rebase flag (3rd argument) to true, sample below
  // await verify.snapshot("Pink Moon", data, true);
  verify.done();
});
