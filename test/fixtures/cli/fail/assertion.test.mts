import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { group } from "good-vibes";

const storage = group("Storage");
let directory: string;

storage.before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "good-vibes-cli-"));
  // Lets the test check that the after script removed it
  if (process.env.TEMP_DIRECTORY_RECORD) {
    await writeFile(process.env.TEMP_DIRECTORY_RECORD, directory);
  }
});

storage.test("reads back", () => {
  assert.deepEqual({ a: undefined }, {});
});

storage.test("still runs", () => {});

storage.after(() => rm(directory, { recursive: true }));
