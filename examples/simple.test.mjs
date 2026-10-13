import assert from "node:assert/strict";
import { test } from "good-vibes";

// A test passes unless it throws, so node:assert works out of the box
test("Fallin", () => {
  assert.equal(1 + 1, 2);
});

// async tests are complete once the promise they return settles
test("If I Ain't Got You", async () => {
  const value = await Promise.resolve("you");
  assert.equal(value, "you");
});

// The test context provides assertions and logging. context.check performs a
// strict deep equality check, like assert.deepStrictEqual
test("No One", async (ctx) => {
  ctx.log("Just good vibes");
  const value = await Promise.resolve({ a: { b: 2, c: [1, 2, 3, 4] } });
  ctx.check({ a: { b: 2, c: [1, 2, 3, 4] } }, value);
});

// Tests that complete in a callback take the context and call done()
test("Gramercy Park", (ctx) => {
  setTimeout(() => {
    ctx.check(true, true).done();
  }, 1000);
});
