const { test } = require("../lib/index");

test("Pink Moon", async (ctx) => {
  const data = {
    a: 1,
    b: "string",
    c: [1, 2, 3, 4],
    d: { a: 1, c: [1, 2, 3, 4] },
  };
  // Verifying a snapshot is asynchronous operation so dont forget to await its execution
  await ctx.snapshot("Blackbird", data);
  // to create snapshot set the rebase flag (3rd argument) to true, sample below
  // await verify.snapshot("Pink Moon", data, true);
  ctx.done();
});

test("Man Kunto Maula", async (ctx) => {
  const data = {
    _id: "61684d0f675129f68ed32af0",
    index: 0,
    guid: "436dff3f-0f5b-4924-b57a-b98b211ea066",
    isActive: false,
    balance: "$2,467.11",
  };
  // Verifying a snapshot is asynchronous operation so dont forget to await its execution
  await ctx.snapshot("Abi Sampa", data, true);
  // to create snapshot set the rebase flag (3rd argument) to true, sample below
  // await verify.snapshot("Pink Moon", data, true);
  ctx.done();
});

test("Kun Faya Kun", async (ctx) => {
  const data = {
    random: 5,
    "random float": 69.767,
    bool: false,
    date: "1990-07-18",
    regEx: "helloooooooooooooooo world",
    enum: "json",
  };
  // Verifying a snapshot is asynchronous operation so dont forget to await its execution
  await ctx.snapshot("Rockstar", data);
  // to create snapshot set the rebase flag (3rd argument) to true, sample below
  // await verify.snapshot("Pink Moon", data, true);
  ctx.done();
});
