import run, { group, test } from "good-vibes";
import { options } from "./options.mjs";

test("Passes", (ctx) => ctx.done());
test("Issue #42 is fixed", (ctx) => ctx.check(1, 2).done());
test("Later", () => {}, { skip: "not yet" });

const { test: groupTest, after } = group("Some Group/Name");
groupTest("Throws", () => {
  throw new Error('quote " and\nnewline');
});
after(() => {
  throw new Error("teardown exploded");
});
group("Some Group/Name")
  .group("Inner")
  .test("Nested", () => {});

run(options);
