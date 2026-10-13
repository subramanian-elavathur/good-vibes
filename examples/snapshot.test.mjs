import { test } from "good-vibes";

test("Pink Moon", async (ctx) => {
  const data = {
    a: 1,
    b: "string",
    c: [1, 2, 3, 4],
    d: { a: 1, c: [1, 2, 3, 4] },
  };
  // Verifying a snapshot is an asynchronous operation so dont forget to await it
  await ctx.snapshot("Blackbird", data);
  // to create or update a baseline set the rebase flag (3rd argument) to true:
  // await ctx.snapshot("Blackbird", data, true);
  ctx.done();
});

test("Man Kunto Maula", async (ctx) => {
  const data = {
    // Order of keys does not matter
    balance: "$2,467.11",
    isActive: false,
    guid: "436dff3f-0f5b-4924-b57a-b98b211ea066",
    index: 0,
    _id: "61684d0f675129f68ed32af0",
  };
  await ctx.snapshot("Abi Sampa", data);
  ctx.done();
});
