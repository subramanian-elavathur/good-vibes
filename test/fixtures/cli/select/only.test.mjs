import { test } from "good-vibes";

test("not marked", () => {
  throw new Error("should not run");
});

test("marked", () => {}, { only: true });
