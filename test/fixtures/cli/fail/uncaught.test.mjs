import { test } from "good-vibes";

test("throws in a timer", (ctx) => {
  setTimeout(() => {
    throw new Error("thrown in a timer");
  });
  setTimeout(() => ctx.done(), 100);
});

test("rejects without awaiting", async () => {
  void Promise.reject(new Error("not awaited"));
  await new Promise((resolve) => setTimeout(resolve, 100));
});

test("passes", () => {});
