import run, { test } from "good-vibes";
import { options } from "./options.mjs";

test("Remembers to call done", (ctx) => ctx.done());

test("Forgets to call done", (ctx) => {
  ctx.check(1, 1);
});

run(options);
