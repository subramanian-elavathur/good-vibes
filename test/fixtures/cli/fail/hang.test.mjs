import { test } from "good-vibes";

test("never finishes", () => new Promise(() => {}));

test("forgets to call done", (ctx) => {
  ctx.log("not calling done");
});

test("runs after the timeouts", () => {});
