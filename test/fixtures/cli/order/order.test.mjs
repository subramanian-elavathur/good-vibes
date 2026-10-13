import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { group } from "good-vibes";

const events = [];

const outer = group("Outer");
outer.before(() => {
  events.push("outer before");
});
outer.test("first", async () => {
  await sleep(20);
  events.push("first");
});

const inner = outer.group("Inner");
inner.before(() => {
  events.push("inner before");
});
inner.test("inner test", () => {
  events.push("inner test");
});
inner.after(() => {
  events.push("inner after");
});

outer.test("last", () => {
  events.push("last");
});
outer.after(() => {
  events.push("outer after");
});

const parallel = group("Parallel");
parallel.concurrent();
parallel.test("slow", async () => {
  await sleep(50);
  events.push("slow");
});
parallel.test("fast", async () => {
  await sleep(10);
  events.push("fast");
});
parallel.after(() => {
  assert.deepEqual(events, [
    "outer before",
    "first",
    "inner before",
    "inner test",
    "inner after",
    "last",
    "outer after",
    "fast",
    "slow",
  ]);
  console.log("order verified");
});
