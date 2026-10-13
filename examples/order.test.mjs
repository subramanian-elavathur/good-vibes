import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { group } from "good-vibes";

// Tests in a group run one after another, in the order they are declared

const underdog = group("Underdog");

let strings;

underdog.before(() => {
  strings = ["good"];
});

underdog.test("good vibes passthrough", () => {
  strings.push("vibes");
});

underdog.test("good vibes", () => {
  assert.equal(strings.join(" "), "good vibes");
});

underdog.test("good vibes all", async () => {
  await sleep(1000);
  strings.push("all");
  assert.equal(strings.join(" "), "good vibes all");
});

underdog.test("good vibes all around", () => {
  strings.push("around");
  assert.equal(strings.join(" "), "good vibes all around");
});

// Call concurrent() to run the tests in a group at the same time instead
const empire = group("Empire State of Mind");
empire.concurrent();

const finished = [];

empire.test("Concrete jungle", async () => {
  await sleep(200);
  finished.push("Concrete jungle");
});

empire.test("Where dreams are made of", async () => {
  await sleep(100);
  finished.push("Where dreams are made of");
});

empire.after(() => {
  assert.deepEqual(finished, ["Where dreams are made of", "Concrete jungle"]);
});
