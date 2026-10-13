import { group } from "good-vibes";

const { test } = group("Failing Tests");

test("Show me love", () => {
  throw new Error("I keep on fallin");
});

test("Underdog", (ctx) => {
  ctx.check(true, false);
  ctx.log("lets assert a passing test");
  ctx.check(true, true);
  ctx.log("This test should still fail");
  ctx.done();
});

test("Girl on Fire", async () => {
  await Promise.resolve();
  // Errors thrown by async tests fail the test instead of crashing the run
  throw new Error("This girl is on fire");
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
  // The stored baseline is different, so this prints a diff and fails
  await ctx.snapshot("Rockstar", data);
  ctx.done();
});
