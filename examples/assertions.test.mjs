import assert from "node:assert/strict";
import { test } from "good-vibes";

const parse = (json) => JSON.parse(json);
const load = async (key) => {
  throw new Error(`Key ${key} not found`);
};

// Use node:assert...
test("Karma", async () => {
  assert.deepEqual(parse('{"a":1}'), { a: 1 });
  // Equality is strict: a property set to undefined is not the same as no property
  assert.notDeepEqual({ a: undefined }, {});
  assert.throws(() => parse("{"), { name: "SyntaxError" });
  await assert.rejects(load("karma"), { message: "Key karma not found" });
});

// ...or the assertions of the test context, which log every failure instead of
// stopping at the first one
test("Diary", async (ctx) => {
  ctx
    .check({ a: 1 }, parse('{"a":1}'))
    .throws(() => parse("{"), /JSON/)
    .check(true, Boolean("truthy"));
  await ctx.rejects(load("diary"), "Key diary not found");
});
