import run, { group } from "good-vibes";
import { options } from "./options.mjs";

const brokenBefore = group("Broken before");
brokenBefore.before(async () => {
  await Promise.resolve();
  throw new Error("setup exploded");
});
brokenBefore.test("Needs setup", (ctx) => {
  ctx.log("this test should never run");
  ctx.done();
});
brokenBefore.after((ctx) => {
  ctx.log("cleanup still runs");
  ctx.done();
});

const brokenAfter = group("Broken after");
brokenAfter.test("Fine", (ctx) => ctx.check(1, 1).done());
brokenAfter.after(() => {
  throw new Error("teardown exploded");
});

const healthy = group("Healthy");
healthy.before((ctx) => setTimeout(() => ctx.done(), 10));
healthy.test("Also fine", (ctx) => ctx.check(1, 1).done());

run(options);
