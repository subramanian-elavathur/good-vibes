// Not matched by test/**/*.test.ts, check.mjs runs it to check failures
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { group } from "good-vibes";
import { createTempDir, removeTempDir } from "./helpers.ts";

const failing = group("failing");
let directory: string;

failing.before(async () => {
  directory = await createTempDir("fail");
  const record = process.env.TEMP_DIRECTORY_RECORD;
  if (record) {
    await writeFile(record, directory);
  }
});

failing.after(() => removeTempDir(directory));

failing.test("strict deep equality", () => {
  assert.deepEqual({ a: undefined }, {});
});
