import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import type * as GoodVibes from "../src/index.ts";
import { lineIndex, runScript } from "./helpers.mts";

const require = createRequire(import.meta.url);
const { calculateExecutionTime } = require("good-vibes") as typeof GoodVibes;

describe("errors thrown by tests", () => {
  it("fail the test instead of crashing the run", async () => {
    const { code, stdout, stderr } = await runScript(
      "test/fixtures/errors.mjs",
    );
    assert.equal(code, 1, stdout + stderr);
    assert.equal(stderr, "");
    assert.match(stdout, /^Hey 3\/4 tests failed, but its going to be ok\./m);
    assert.match(
      stdout,
      /^1\. \[Default\] Sync throw \(thrown synchronously\)$/m,
    );
    assert.match(
      stdout,
      /^2\. \[Default\] Async rejection \(rejected asynchronously\)$/m,
    );
    assert.match(
      stdout,
      /^3\. \[Default\] Rejects with a string \(not an error object\)$/m,
    );
    assert.match(stdout, /^Finished: Passes \[PASSED in [\d.]+ seconds\]$/m);
  });

  it("are logged with their stack trace", async () => {
    const { stdout } = await runScript("test/fixtures/errors.mjs");
    assert.match(
      stdout,
      /^Log: Async rejection: Error: rejected asynchronously\n\s+at .*errors\.mjs/m,
    );
  });
});

describe("returnCodeOnFailure", () => {
  it("is used as the exit code when tests fail", async () => {
    const { code } = await runScript("test/fixtures/errors.mjs", {
      options: { returnCodeOnFailure: 7 },
    });
    assert.equal(code, 7);
  });
});

describe("assertions", () => {
  it("use deep equality and count passes and failures", async () => {
    const { code, stdout } = await runScript("test/fixtures/assertions.mjs");
    assert.equal(code, 1);
    assert.match(stdout, /^Finished: Deep equality \[PASSED/m);
    assert.match(stdout, /^Log: Deep equality: 3\/3 Assertions PASSED$/m);
    assert.match(stdout, /^Finished: No assertions \[PASSED/m);
    assert.match(
      stdout,
      /^Log: Second assertion fails: Assertion 2: Expected 'expected' to match 'actual'$/m,
    );
    assert.match(
      stdout,
      /^Log: Second assertion fails: 2\/3 Assertions PASSED$/m,
    );
    assert.match(stdout, /^Finished: Second assertion fails \[FAILED/m);
  });

  it("can print values JSON.stringify cannot handle", async () => {
    const { stdout, stderr } = await runScript("test/fixtures/assertions.mjs");
    assert.equal(stderr, "");
    assert.match(
      stdout,
      /^Log: Values JSON cannot serialize: Assertion 1: Expected 1n to match 2n$/m,
    );
    assert.match(
      stdout,
      /^Log: Values JSON cannot serialize: Assertion 2: Expected <ref \*1> \{ name: 'circular', self: \[Circular \*1\] \} to match \{ name: 'circular' \}$/m,
    );
  });
});

describe("before and after scripts", () => {
  it("skip the tests in a group when the before script fails", async () => {
    const { code, stdout, stderr } = await runScript("test/fixtures/hooks.mjs");
    assert.equal(code, 1, stdout + stderr);
    assert.doesNotMatch(stdout, /this test should never run/);
    assert.match(stdout, /^Log: Before: Error: setup exploded$/m);
    assert.match(
      stdout,
      /^Skipping all tests in Broken before group as the before script failed$/m,
    );
    assert.match(
      stdout,
      /\[Broken before\] Needs setup \(Before script failed: setup exploded\)$/m,
    );
  });

  it("still run the after script when the before script fails", async () => {
    const { stdout } = await runScript("test/fixtures/hooks.mjs");
    assert.match(stdout, /^Log: After: cleanup still runs$/m);
  });

  it("fail the run when the after script fails", async () => {
    const { stdout } = await runScript("test/fixtures/hooks.mjs");
    assert.match(
      stdout,
      /^Hey 1\/3 tests failed and 1 after script\(s\) failed, but its going to be ok\./m,
    );
    assert.match(
      stdout,
      /\[Broken after\] After script \(teardown exploded\)$/m,
    );
    assert.match(stdout, /^Finished: Fine \[PASSED/m);
    assert.match(stdout, /^Finished: Also fine \[PASSED/m);
  });
});

describe("timeout", () => {
  it("exits with return code 1 and lists unfinished tests", async () => {
    const { code, stdout } = await runScript("test/fixtures/timeout.mjs", {
      options: { timeout: 500 },
    });
    assert.equal(code, 1);
    assert.match(
      stdout,
      /^\[TIMEOUT\] Global test timeout exceeded 0\.5 seconds\. Exiting\.$/m,
    );
    assert.match(
      stdout,
      /did they forget to call done\(\)\?\n- \[Default\] Forgets to call done$/m,
    );
    assert.doesNotMatch(stdout, /- \[Default\] Remembers to call done/);
  });
});

describe("executionTimePrecision", () => {
  it("rounds execution times to the given number of decimal places", async () => {
    const { code, stdout } = await runScript("test/fixtures/precision.mjs", {
      options: { executionTimePrecision: 1 },
    });
    assert.equal(code, 0);
    const line = lineIndex(stdout, "Finished: Takes a little while");
    assert.match(stdout.split("\n")[line], /\[PASSED in (0|0\.\d) seconds\]$/);
  });

  it("converts milliseconds to seconds", () => {
    assert.equal(calculateExecutionTime(4, 7, 3), 0.003);
    assert.equal(calculateExecutionTime(0, 2003, 3), 2.003);
    assert.equal(calculateExecutionTime(0, 2003, 5), 2.003);
    assert.equal(calculateExecutionTime(0, 1234.5678), 1.235);
    assert.equal(calculateExecutionTime(0, 1250, 1), 1.3);
    assert.equal(calculateExecutionTime(0, 1234, 0), 1);
    assert.equal(calculateExecutionTime(0, 1234, -2), 1);
  });
});

describe("colors", () => {
  it("highlights passes and failures unless NO_COLOR is set", async () => {
    const { stdout } = await runScript("test/fixtures/errors.mjs", {
      env: { NO_COLOR: "" },
    });
    assert.ok(stdout.includes("\x1b[32mFinished: Passes [PASSED"));
    assert.ok(stdout.includes("\x1b[31mFinished: Sync throw [FAILED"));
  });

  it("are disabled when NO_COLOR is set", async () => {
    const { stdout } = await runScript("test/fixtures/errors.mjs");
    assert.ok(!stdout.includes("\x1b["));
  });
});
