import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { makeTempDir, runScript } from "./helpers.mts";

describe("TAP reporter", () => {
  it("writes a TAP report for every group", async (t) => {
    const cwd = await makeTempDir(t);
    const { code, stdout } = await runScript("test/fixtures/reporter.mjs", {
      cwd,
      options: { reportTestResults: true, testResultsDirectory: "reports" },
    });
    assert.equal(code, 1, stdout);

    const reports = path.join(cwd, "reports");
    assert.deepEqual((await readdir(reports)).sort(), [
      "default.tap",
      "some-group-name.tap",
    ]);
    assert.equal(
      await readFile(path.join(reports, "default.tap"), "utf8"),
      [
        "TAP version 13",
        "1..2",
        "ok 1 Passes",
        "not ok 2 Issue \\#42 is fixed",
        "",
      ].join("\n"),
    );
    assert.equal(
      await readFile(path.join(reports, "some-group-name.tap"), "utf8"),
      [
        "TAP version 13",
        "1..2",
        "not ok 1 Throws",
        "  ---",
        '  message: "quote \\" and\\nnewline"',
        "  ...",
        "not ok 2 After script",
        "  ---",
        '  message: "teardown exploded"',
        "  ...",
        "",
      ].join("\n"),
    );
  });

  it("writes to test-results by default", async (t) => {
    const cwd = await makeTempDir(t);
    await runScript("test/fixtures/reporter.mjs", {
      cwd,
      options: { reportTestResults: true },
    });
    assert.deepEqual((await readdir(path.join(cwd, "test-results"))).sort(), [
      "default.tap",
      "some-group-name.tap",
    ]);
  });

  it("does not write reports unless enabled", async (t) => {
    const cwd = await makeTempDir(t);
    await runScript("test/fixtures/reporter.mjs", { cwd });
    assert.deepEqual(await readdir(cwd), []);
  });
});
