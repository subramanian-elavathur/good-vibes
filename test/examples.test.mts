import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { lineIndex, runScript, type RunResult } from "./helpers.mts";

describe("passing examples", () => {
  let result: RunResult;
  before(async () => {
    result = await runScript("examples/index.mjs");
  });

  it("exits with return code 0", () => {
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /^All 12 tests passed, good vibes :\)$/m);
  });

  it("runs groups one after another, in the order they were declared", () => {
    const groups = [
      ["Default", 5],
      ["Tash Sultana", 2],
      ["Tadow", 1],
      ["Underdog", 4],
    ] as const;
    const finished = groups.map(([group, count]) =>
      lineIndex(result.stdout, `Finished running ${count} tests from ${group}`),
    );
    assert.deepEqual(
      finished,
      finished.toSorted((a, b) => a - b),
    );
    // A group only starts once the previous one has finished
    assert.ok(
      lineIndex(result.stdout, "Running 2 tests from Tash Sultana") >
        finished[0],
    );
  });

  it("runs tests in a group concurrently by default", () => {
    const { stdout } = result;
    assert.ok(
      lineIndex(stdout, "Running: Notion") <
        lineIndex(stdout, "Finished: Jungle"),
    );
    // "Fallin" was declared after "Gramercy Park" but does not wait 2 seconds
    assert.ok(
      lineIndex(stdout, "Finished: Fallin") <
        lineIndex(stdout, "Finished: Gramercy Park"),
    );
  });

  it("runs tests in a sync group one at a time, in declaration order", () => {
    let previous = -1;
    for (const name of [
      "good vibes passthrough",
      "good vibes",
      "good vibes all",
      "good vibes all around",
    ]) {
      const started = lineIndex(
        result.stdout,
        new RegExp(`^Running: ${name}$`),
      );
      const finished = lineIndex(result.stdout, `Finished: ${name} [`);
      assert.ok(previous < started && started < finished, name);
      previous = finished;
    }
  });

  it("runs before and after scripts", () => {
    assert.match(
      result.stdout,
      /^Log: Before: This log prints after 2 seconds$/m,
    );
    assert.match(
      result.stdout,
      /^Log: After: In the after method you may perform any cleanup you like\./m,
    );
  });

  it("measures execution time in seconds", () => {
    assert.match(
      result.stdout,
      /^Finished: Before script in 2\.\d{1,3} seconds$/m,
    );
    assert.match(
      result.stdout,
      /^Finished: Gramercy Park \[PASSED in 2\.\d{1,3} seconds\]$/m,
    );
  });

  it("compares snapshots", () => {
    assert.match(
      result.stdout,
      /^Log: Pink Moon: Snapshot Blackbird: PASSED$/m,
    );
    assert.match(
      result.stdout,
      /^Log: Man Kunto Maula: Snapshot Abi Sampa: PASSED$/m,
    );
  });
});

describe("failing examples", () => {
  let result: RunResult;
  before(async () => {
    result = await runScript("test/fixtures/failing-examples.mjs");
  });

  it("exits with return code 1", () => {
    assert.equal(result.code, 1, result.stdout + result.stderr);
  });

  it("lists every failed test in the summary", () => {
    assert.match(
      result.stdout,
      /^Hey 4\/4 tests failed, but its going to be ok\./m,
    );
    for (const failure of [
      "[Failing Tests] Show me love (I keep on fallin)",
      "[Failing Tests] Underdog",
      "[Failing Tests] Girl on Fire (This girl is on fire)",
      "[Failing Tests] Kun Faya Kun",
    ]) {
      assert.ok(result.stdout.includes(failure), failure);
    }
  });

  it("reports failed assertions", () => {
    assert.match(
      result.stdout,
      /^Log: Underdog: Assertion 1: Expected true to match false$/m,
    );
    assert.match(result.stdout, /^Log: Underdog: 1\/2 Assertions PASSED$/m);
  });

  it("prints a diff when a snapshot does not match", () => {
    assert.match(
      result.stdout,
      /^Log: Kun Faya Kun: Snapshot Rockstar: FAILED, see diff below \(- baseline, \+ actual\)$/m,
    );
    assert.match(result.stdout, /^- {3}"random float": 69\.768,$/m);
    assert.match(result.stdout, /^\+ {3}"random float": 69\.767,$/m);
    assert.match(result.stdout, /^ {4}"bool": false,$/m);
  });
});

describe("debug example", () => {
  it("only runs tests in the Debug group and exits with return code 1", async () => {
    const { code, stdout } = await runScript(
      "test/fixtures/debug-examples.mjs",
    );
    assert.equal(code, 1);
    assert.match(stdout, /^Running 1 tests from Debug group$/m);
    assert.match(stdout, /^Log: Before: You can run before and after blocks/m);
    assert.match(
      stdout,
      /^Finished: Johnny Cash \[PASSED in 2\.\d+ seconds\]$/m,
    );
    assert.doesNotMatch(stdout, /Gramercy Park/);
    assert.match(stdout, /Good vibes is running in Debug mode/);
  });
});
