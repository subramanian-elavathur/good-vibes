import { DEBUG, test } from "good-vibes";

test("normal", () => {
  throw new Error("should not run");
});

test("debugging", () => {}, DEBUG);
