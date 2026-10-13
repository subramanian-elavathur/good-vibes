import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { runCli, type RunResult } from "./helpers.mts";

const SNAPSHOTS = ["--snapshots-dir", "examples/__snapshots__"];

describe("passing examples", () => {
  let result: RunResult;
  before(async () => {
    result = await runCli([...SNAPSHOTS, "examples/*.test.{mjs,mts}"]);
  });

  it("exits with return code 0", () => {
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(
      result.stdout,
      /^Ran 21 tests from 7 files in [\d.]+ seconds$/m,
    );
    assert.match(result.stdout, /^All 21 tests passed, good vibes :\)$/m);
  });

  it("does not run the failure examples", () => {
    assert.doesNotMatch(result.stdout, /examples\/failures/);
  });

  it("runs TypeScript files", () => {
    assert.match(
      result.stdout,
      /^Running tests in examples\/typescript\.test\.mts$/m,
    );
    assert.match(result.stdout, /^Finished: A Woman's Worth \[PASSED/m);
  });

  it("runs nested groups", () => {
    assert.match(result.stdout, /^Running 1 tests from Tadow › FKJ group$/m);
  });

  it("measures execution time in seconds", () => {
    assert.match(
      result.stdout,
      /^Finished: Gramercy Park \[PASSED in 1\.\d{1,3} seconds\]$/m,
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
    result = await runCli([...SNAPSHOTS, "examples/failures/failing.test.mjs"]);
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
      "Failing Tests › Show me love (I keep on fallin)",
      "Failing Tests › Underdog (Assertion 1: Expected true to match false)",
      "Failing Tests › Girl on Fire (This girl is on fire)",
      "Failing Tests › Kun Faya Kun (Snapshot Rockstar: FAILED",
    ]) {
      assert.ok(
        result.stdout.includes(
          `examples/failures/failing.test.mjs › ${failure}`,
        ),
        failure,
      );
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
    const { code, stdout } = await runCli(["examples/failures/debug.test.mjs"]);
    assert.equal(code, 1);
    assert.match(stdout, /^Running 1 tests from Debug group$/m);
    assert.match(stdout, /^Log: Before: You can run before and after blocks/m);
    assert.match(
      stdout,
      /^Finished: Johnny Cash \[PASSED in 2\.\d+ seconds\]$/m,
    );
    assert.match(stdout, /Good vibes is running in Debug mode/);
  });
});
