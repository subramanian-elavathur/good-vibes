import run, { test } from "good-vibes";
import { options } from "./options.mjs";

test("Deep equality", (ctx) => {
  ctx
    .check(
      { a: 1, b: [1, 2, { c: "three" }] },
      { b: [1, 2, { c: "three" }], a: 1 },
    )
    .check(
      new Map([["key", new Set([1, 2])]]),
      new Map([["key", new Set([1, 2])]]),
    )
    .check(new Date(0), new Date(0))
    .done();
});

test("No assertions", (ctx) => {
  ctx.done();
});

test("Second assertion fails", (ctx) => {
  ctx.check(1, 1).check("expected", "actual").check(true, true).done();
});

test("Values JSON cannot serialize", (ctx) => {
  const circular = { name: "circular" };
  circular.self = circular;
  ctx.check(1n, 2n).check(circular, { name: "circular" }).done();
});

run(options);
