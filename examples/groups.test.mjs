import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, test, after } from "good-vibes";

// Groups are just strings that group together a set of related tests
// Using groups allows you to specify before and after scripts as described below
const TASH_SULTANA = "Tash Sultana";

let directory;

// before runs once, before the tests in the group
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "good-vibes-"));
  await writeFile(path.join(directory, "song.txt"), "Jungle");
}, TASH_SULTANA);

// Tests in a group run one after another, in the order they are declared, so
// later tests can build on earlier ones

test(
  "Jungle",
  async () => {
    assert.equal(
      await readFile(path.join(directory, "song.txt"), "utf8"),
      "Jungle",
    );
  },
  TASH_SULTANA,
);

test(
  "Notion",
  async () => {
    await writeFile(path.join(directory, "song.txt"), "Notion");
  },
  TASH_SULTANA,
);

test(
  "Mystik",
  async () => {
    assert.equal(
      await readFile(path.join(directory, "song.txt"), "utf8"),
      "Notion",
    );
  },
  TASH_SULTANA,
);

// after runs once all tests in the group finished, even if some failed
after(() => rm(directory, { recursive: true, force: true }), TASH_SULTANA); // group name is important so dont forget it :)
