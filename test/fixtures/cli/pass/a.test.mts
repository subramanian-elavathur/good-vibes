import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { group, type TestContext } from "good-vibes";
import { label } from "./helpers.mts";

const storage = group("Storage");
let directory: string;
const file = () => path.join(directory, "value.txt");

storage.before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "good-vibes-cli-"));
  await writeFile(file(), "seed");
});

storage.test("reads the seed", async () => {
  assert.equal(await readFile(file(), "utf8"), "seed");
});

storage.test("writes", async () => {
  await writeFile(file(), "updated");
});

const nested = storage.group("Nested");

nested.test("sees earlier writes", async () => {
  assert.equal(await readFile(file(), "utf8"), "updated");
});

storage.test("checks with the context", (ctx: TestContext) => {
  ctx.check(label("a"), "label: a").done();
});

storage.after(async () => {
  await rm(directory, { recursive: true });
  console.log("cleanup done");
});
