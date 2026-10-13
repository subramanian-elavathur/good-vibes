import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { lineIndex, makeTempDir, ROOT, runCli } from "./helpers.mts";

const FIXTURES = "test/fixtures/cli";

describe("good-vibes command", () => {
  describe("finding test files", () => {
    it("runs the files matching a glob, but no other files", async () => {
      const { code, stdout, stderr } = await runCli([
        `${FIXTURES}/pass/**/*.test.{mts,mjs}`,
      ]);
      assert.equal(code, 0, stdout + stderr);
      assert.match(
        stdout,
        /^Running tests in test\/fixtures\/cli\/pass\/a\.test\.mts$/m,
      );
      assert.match(
        stdout,
        /^Running tests in test\/fixtures\/cli\/pass\/b\.test\.mjs$/m,
      );
      assert.doesNotMatch(stdout, /Running tests in .*helpers/);
      // Loaded once, by the test file that imports it
      assert.equal(stdout.match(/^helpers loaded$/gm)?.length, 1);
      assert.match(stdout, /^Ran 8 tests from 2 files in [\d.]+ seconds$/m);
      assert.match(stdout, /^All 8 tests passed, good vibes :\)$/m);
    });

    it("runs a single file", async () => {
      const { code, stdout } = await runCli([`${FIXTURES}/pass/b.test.mjs`]);
      assert.equal(code, 0, stdout);
      assert.match(stdout, /^All 4 tests passed, good vibes :\)$/m);
    });

    it("runs the test files in a directory", async () => {
      const { code, stdout } = await runCli([`${FIXTURES}/pass`]);
      assert.equal(code, 0, stdout);
      assert.match(stdout, /^Ran 8 tests from 2 files/m);
    });

    it("looks for test files in the working directory by default", async () => {
      const { code, stdout } = await runCli([], {
        cwd: path.join(ROOT, FIXTURES, "pass"),
      });
      assert.equal(code, 0, stdout);
      assert.match(stdout, /^Running tests in a\.test\.mts$/m);
    });

    it("fails when no files match", async () => {
      const { code, stdout } = await runCli(["nothing/**/*.test.js"]);
      assert.equal(code, 1);
      assert.match(
        stdout,
        /^No test files found matching "nothing\/\*\*\/\*\.test\.js"$/m,
      );
    });

    it("fails when the files contain no tests", async () => {
      const { code, stdout } = await runCli([`${FIXTURES}/empty`]);
      assert.equal(code, 1);
      assert.match(
        stdout,
        /^No tests found in test\/fixtures\/cli\/empty\/no-tests\.test\.mjs$/m,
      );
      assert.match(stdout, /^No tests found$/m);
    });
  });

  describe("running tests", () => {
    it("runs TypeScript files directly, with groups, nested groups and scripts", async () => {
      const { code, stdout } = await runCli([`${FIXTURES}/pass/a.test.mts`]);
      assert.equal(code, 0, stdout);
      assert.match(stdout, /^Running 4 tests from Storage group$/m);
      assert.match(stdout, /^Running 1 tests from Storage › Nested group$/m);
      assert.match(stdout, /^cleanup done$/m);
    });

    it("runs tests in declaration order, including nested groups and concurrent groups", async () => {
      const { code, stdout } = await runCli([`${FIXTURES}/order`]);
      assert.equal(code, 0, stdout);
      assert.match(stdout, /^order verified$/m);
    });

    it("completes tests when they return, when their promise settles or when they call done()", async () => {
      const { code, stdout, stderr } = await runCli([
        `${FIXTURES}/pass/b.test.mjs`,
      ]);
      assert.equal(code, 0, stdout);
      // Output of console.error is passed through
      assert.equal(stderr, "an expected error message\n");
    });

    it("prints the output of parallel files without interleaving it", async () => {
      const { stdout } = await runCli([
        "--concurrency",
        "2",
        `${FIXTURES}/pass`,
      ]);
      const blocks = [
        ["a.test.mts", "Finished running 4 tests from Storage group"],
        ["b.test.mjs", "Finished running 4 tests from Default group"],
      ].map(([file, lastLine]) => ({
        start: lineIndex(stdout, `Running tests in ${FIXTURES}/pass/${file}`),
        end: lineIndex(stdout, lastLine),
      }));
      const [first, second] = blocks.sort((x, y) => x.start - y.start);
      assert.ok(first.start < first.end && first.end < second.start);
      assert.ok(second.start < second.end);
    });
  });

  describe("failures", () => {
    it("reports failed assertions with the file, group and test, and still cleans up", async (t) => {
      const record = path.join(await makeTempDir(t), "directory.txt");
      const { code, stdout } = await runCli(
        [`${FIXTURES}/fail/assertion.test.mts`],
        { env: { TEMP_DIRECTORY_RECORD: record } },
      );
      assert.equal(code, 1);
      // The diff from node:assert is logged
      assert.match(stdout, /Expected values to be strictly deep-equal:/);
      assert.match(stdout, /^\+ {3}a: undefined$/m);
      assert.match(stdout, /^Finished: still runs \[PASSED/m);
      assert.match(
        stdout,
        /^1\. test\/fixtures\/cli\/fail\/assertion\.test\.mts › Storage › reads back \(Expected values to be strictly deep-equal:\)$/m,
      );
      const directory = await readFile(record, "utf8");
      await assert.rejects(stat(directory), { code: "ENOENT" });
    });

    it("reports test files that fail to load", async () => {
      const { code, stdout } = await runCli([
        `${FIXTURES}/fail/broken.test.mjs`,
      ]);
      assert.equal(code, 1);
      assert.match(
        stdout,
        /^1\. test\/fixtures\/cli\/fail\/broken\.test\.mjs \(Failed to load test file: Cannot find module .*missing-module\.mjs/m,
      );
    });

    it("reports test files that exit before reporting their results", async () => {
      const { code, stdout } = await runCli([`${FIXTURES}/fail/exit.test.mjs`]);
      assert.equal(code, 1);
      assert.match(
        stdout,
        /exit\.test\.mjs \(The test file exited with return code 3 before reporting its results\)$/m,
      );
    });

    it("fails tests that time out and carries on", async () => {
      const { code, stdout } = await runCli([
        "--timeout",
        "300",
        `${FIXTURES}/fail/hang.test.mjs`,
      ]);
      assert.equal(code, 1);
      assert.match(stdout, /› never finishes \(Timed out after 300 ms\)$/m);
      assert.match(
        stdout,
        /› forgets to call done \(Timed out after 300 ms waiting for done\(\) to be called\)$/m,
      );
      assert.match(stdout, /^Finished: runs after the timeouts \[PASSED/m);
    });

    it("fails the running test when an error is not caught", async () => {
      const { code, stdout } = await runCli([
        `${FIXTURES}/fail/uncaught.test.mjs`,
      ]);
      assert.equal(code, 1);
      assert.match(stdout, /› throws in a timer \(thrown in a timer\)$/m);
      assert.match(stdout, /› rejects without awaiting \(not awaited\)$/m);
      assert.match(stdout, /^Finished: passes \[PASSED/m);
    });

    it("summarizes failures across files", async () => {
      const { code, stdout } = await runCli([
        "--timeout",
        "300",
        `${FIXTURES}/fail`,
      ]);
      assert.equal(code, 1);
      assert.match(
        stdout,
        /^Hey 5\/8 tests failed and 2 other error\(s\) occurred, but its going to be ok\./m,
      );
    });
  });

  describe("selecting tests", () => {
    it("--grep runs tests whose name or group matches", async () => {
      const byGroup = await runCli([
        "--grep",
        "^Fruits$",
        `${FIXTURES}/select/select.test.mjs`,
      ]);
      assert.equal(byGroup.code, 0, byGroup.stdout);
      assert.match(byGroup.stdout, /^All 2 tests passed, good vibes :\)$/m);
      assert.doesNotMatch(byGroup.stdout, /carrot/);

      const byName = await runCli([
        "--grep",
        "carr",
        `${FIXTURES}/select/select.test.mjs`,
      ]);
      assert.match(byName.stdout, /^All 1 tests passed, good vibes :\)$/m);
      assert.match(byName.stdout, /^Running: carrot$/m);
    });

    it("fails when --grep matches no tests", async () => {
      const { code, stdout } = await runCli([
        "--grep",
        "nothing",
        `${FIXTURES}/select`,
      ]);
      assert.equal(code, 1);
      assert.match(stdout, /^No tests found$/m);
    });

    it("reports skipped tests", async () => {
      const { code, stdout } = await runCli([
        `${FIXTURES}/select/select.test.mjs`,
      ]);
      assert.equal(code, 0, stdout);
      assert.match(stdout, /^Skipped: pumpkin \(not in season\)$/m);
      assert.match(
        stdout,
        /^All 3 tests passed \(1 skipped\), good vibes :\)$/m,
      );
    });

    it("only runs tests marked with only, and exits with return code 1", async () => {
      const { code, stdout } = await runCli([
        `${FIXTURES}/select/only.test.mjs`,
      ]);
      assert.equal(code, 1);
      assert.doesNotMatch(stdout, /should not run|not marked/);
      assert.match(stdout, /^All 1 tests passed, good vibes :\)$/m);
      assert.match(stdout, /only ran the tests marked with `only`/);
    });

    it("only runs the Debug group, and exits with return code 1", async () => {
      const { code, stdout } = await runCli([`${FIXTURES}/debug`]);
      assert.equal(code, 1);
      assert.doesNotMatch(stdout, /should not run/);
      assert.match(stdout, /^Finished: debugging \[PASSED/m);
      assert.match(stdout, /Good vibes is running in Debug mode/);
    });
  });

  describe("output", () => {
    it("has no colors when stdout is not a terminal", async () => {
      const { stdout } = await runCli([`${FIXTURES}/pass`], {
        env: { NO_COLOR: undefined },
      });
      assert.ok(!stdout.includes("\x1b["));
    });

    it("has colors when FORCE_COLOR is set, including the output of test files", async () => {
      const { stdout } = await runCli([`${FIXTURES}/pass/b.test.mjs`], {
        env: { NO_COLOR: undefined, FORCE_COLOR: "1" },
      });
      assert.ok(stdout.includes("\x1b[32mFinished: completes when it returns"));
      assert.ok(stdout.includes("\x1b[32mAll 4 tests passed"));
    });
  });

  describe("coverage", () => {
    it("passes NODE_V8_COVERAGE on to test files", async (t) => {
      const coverage = await makeTempDir(t);
      await runCli([`${FIXTURES}/pass/b.test.mjs`], {
        env: { NODE_V8_COVERAGE: coverage },
      });
      const reports = await Promise.all(
        (await readdir(coverage)).map((file) =>
          readFile(path.join(coverage, file), "utf8"),
        ),
      );
      assert.ok(reports.some((report) => report.includes("pass/b.test.mjs")));
    });
  });

  describe("usage", () => {
    it("prints help", async () => {
      const { code, stdout } = await runCli(["--help"]);
      assert.equal(code, 0);
      assert.match(
        stdout,
        /^Usage: good-vibes \[options\] \[patterns\.\.\.\]$/m,
      );
      assert.match(stdout, /--timeout <ms>/);
    });

    it("prints the version", async () => {
      const { code, stdout } = await runCli(["--version"]);
      const packageJson = JSON.parse(
        await readFile(path.join(ROOT, "package.json"), "utf8"),
      ) as { version: string };
      assert.equal(code, 0);
      assert.equal(stdout, `${packageJson.version}\n`);
    });

    it("rejects unknown options and invalid values", async () => {
      for (const args of [
        ["--bogus"],
        ["--timeout", "soon"],
        ["--concurrency", "0"],
        ["--grep", "("],
      ]) {
        const { code, stderr } = await runCli(args);
        assert.equal(code, 1, args.join(" "));
        assert.match(stderr, /^good-vibes: .*\n\nUsage:/, args.join(" "));
      }
    });
  });
});
