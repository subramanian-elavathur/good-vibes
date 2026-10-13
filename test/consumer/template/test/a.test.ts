import assert from "node:assert/strict";
import { group } from "good-vibes";
import Store from "../src/store.ts";
import { createTempDir, removeTempDir } from "./helpers.ts";

const store = group("store");
let directory: string;
let db: Store<{ a?: number }>;

store.before(async () => {
  directory = await createTempDir("a");
  db = new Store(directory);
  await db.set("seed", { a: 1 });
});

store.after(() => removeTempDir(directory));

store.test("get", async () => {
  assert.deepEqual(await db.get("seed"), { a: 1 });
});

store.test("set", async () => {
  await db.set("key", { a: undefined });
});

store.test("set dropped the undefined value", async () => {
  const value = await db.get("key");
  assert.deepEqual(value, {});
  assert.notDeepEqual(value, { a: undefined });
});

store.test("delete", async () => {
  assert.equal(await db.delete("key"), true);
  // Logs with console.error
  assert.equal(await db.get("key"), undefined);
});

const keys = store.group("keys");

keys.before(async () => {
  await db.set("other", {});
});

keys.test("lists keys", async () => {
  assert.deepEqual(await db.keys(), ["other", "seed"]);
});

store.test("rejects with a message", async () => {
  await assert.rejects(db.load("missing"), {
    message: "Key missing not found",
  });
});

store.test("throws with a message", () => {
  assert.throws(() => db.pathOf("../escape"), {
    message: "Invalid key ../escape",
  });
});
