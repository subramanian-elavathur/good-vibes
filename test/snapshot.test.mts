import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { makeTempDir, runScript } from "./helpers.mts";

const FIXTURE = "test/fixtures/snapshots.mjs";

// Matches the default snapshotsDirectory for the "Default" group
const baselinePath = (cwd: string) =>
  path.join(cwd, "test", "__snapshots__", "Default", "Album_Songs.json");

const writeBaseline = async (cwd: string, contents: string) => {
  await mkdir(path.dirname(baselinePath(cwd)), { recursive: true });
  await writeFile(baselinePath(cwd), contents);
};

const SONGS = {
  title: "Here",
  year: 2016,
  tracks: ["The Gospel", "Pawn It All", "Holy War"],
};

describe("snapshot", () => {
  it("fails when there is no baseline", async (t) => {
    const cwd = await makeTempDir(t);
    const { code, stdout } = await runScript(FIXTURE, { cwd });
    assert.equal(code, 1);
    assert.match(
      stdout,
      /Snapshot Songs: FAILED as the baseline at .*Album_Songs\.json could not be read \(ENOENT.*\)\. Set the rebase flag to true to create it$/m,
    );
  });

  it("writes a readable baseline and fails when rebasing", async (t) => {
    const cwd = await makeTempDir(t);
    const { code, stdout } = await runScript(FIXTURE, {
      cwd,
      env: { REBASE: "true" },
    });
    assert.equal(code, 1);
    assert.match(
      stdout,
      /Snapshot Songs: FAILED as the rebase flag is set, remove it once the baseline is updated$/m,
    );
    assert.equal(
      await readFile(baselinePath(cwd), "utf8"),
      `${JSON.stringify(SONGS, null, 2)}\n`,
    );

    const rerun = await runScript(FIXTURE, { cwd });
    assert.equal(rerun.code, 0, rerun.stdout);
    assert.match(rerun.stdout, /^Log: Album: Snapshot Songs: PASSED$/m);
  });

  it("ignores the order of keys", async (t) => {
    const cwd = await makeTempDir(t);
    await writeBaseline(
      cwd,
      JSON.stringify({ tracks: SONGS.tracks, year: 2016, title: "Here" }),
    );
    const { code, stdout } = await runScript(FIXTURE, { cwd });
    assert.equal(code, 0, stdout);
  });

  it("prints a diff when the value changed", async (t) => {
    const cwd = await makeTempDir(t);
    await writeBaseline(
      cwd,
      JSON.stringify({ ...SONGS, tracks: ["The Gospel", "Holy War"] }),
    );
    const { code, stdout } = await runScript(FIXTURE, { cwd });
    assert.equal(code, 1);
    assert.match(stdout, /Snapshot Songs: FAILED, see diff below/);
    assert.match(stdout, /^\+ {5}"Pawn It All",$/m);
    assert.match(stdout, /^ {6}"Holy War"$/m);
  });

  it("fails without crashing when the baseline is not valid JSON", async (t) => {
    const cwd = await makeTempDir(t);
    await writeBaseline(cwd, "{ not json");
    const { code, stdout, stderr } = await runScript(FIXTURE, { cwd });
    assert.equal(code, 1);
    assert.equal(stderr, "");
    assert.match(
      stdout,
      /Snapshot Songs: FAILED as the baseline at .* could not be read/,
    );
  });

  it("uses the snapshotsDirectory option", async (t) => {
    const cwd = await makeTempDir(t);
    await runScript(FIXTURE, {
      cwd,
      env: { REBASE: "true" },
      options: { snapshotsDirectory: "custom/snapshots" },
    });
    const baseline = await readFile(
      path.join(cwd, "custom", "snapshots", "Default", "Album_Songs.json"),
      "utf8",
    );
    assert.deepEqual(JSON.parse(baseline), SONGS);
  });
});
