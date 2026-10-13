import { createRequire } from "node:module";
import run, { test } from "good-vibes";

const require = createRequire(import.meta.url);
const goodVibes = require("good-vibes");

test("Registered with import", (ctx) => ctx.done());
goodVibes.test("Registered with require", (ctx) => ctx.done());

run();
