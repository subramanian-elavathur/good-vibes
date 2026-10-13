import run, { test } from "good-vibes";
import { options } from "./options.mjs";

test("Takes a little while", (ctx) => {
  setTimeout(() => ctx.done(), 25);
});

run(options);
