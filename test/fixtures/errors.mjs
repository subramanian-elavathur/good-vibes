import run, { test } from "good-vibes";
import { options } from "./options.mjs";

test("Sync throw", () => {
  throw new Error("thrown synchronously");
});

test("Async rejection", async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error("rejected asynchronously");
});

test("Rejects with a string", () => Promise.reject("not an error object"));

test("Passes", (ctx) => {
  ctx.check(1, 1).done();
});

run(options);
