import assert from "node:assert/strict";
import { group } from "good-vibes";

// good-vibes also exports a "group" function which wraps the standard
// methods: before, test, and after with group name so your tests can be
// written in a concise manner

const tadow = group("Tadow");

let strings;

tadow.before(() => {
  strings = ["you", "saw", "and", "it", "hit", "me", "like", "tadow"];
});

tadow.test("Masego", () => {
  assert.equal(strings.join(" "), "you saw and it hit me like tadow");
});

// Groups can be nested. A nested group runs where it is declared, after the
// before script of its parent and before its after script
const fkj = tadow.group("FKJ");

fkj.before(() => {
  strings.push("again");
});

fkj.test("Live at La Fée Electricité", () => {
  assert.equal(strings.at(-1), "again");
});

tadow.after(() => {
  strings = undefined;
});
