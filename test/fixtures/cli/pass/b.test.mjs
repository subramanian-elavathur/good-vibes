import assert from "node:assert/strict";
import run, { test } from "good-vibes";

test("completes when it returns", () => {
  assert.ok(true);
});

test("completes when the promise settles", async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
});

test("completes when done is called", (ctx) => {
  setTimeout(() => ctx.done(), 10);
});

test("can write to stderr", () => {
  console.error("an expected error message");
});

// Test files written for good-vibes 1.x call run(), the command ignores it
run();
