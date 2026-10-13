import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import type * as CjsExports from "../src/index.ts";
import type * as EsmExports from "../src/index.mts";
import { runScript } from "./helpers.mts";

// Resolves to this package through its "exports" (package self-referencing),
// i.e. exactly what users get. Kept in a variable so type checking does not
// depend on the build output.
const PACKAGE = "good-vibes";

const API = [
  "DEBUG",
  "after",
  "before",
  "calculateExecutionTime",
  "concurrent",
  "group",
  "run",
  "sync",
  "test",
];

describe("package exports", () => {
  it("exposes the same API to import and require", async () => {
    const esm = (await import(PACKAGE)) as typeof EsmExports;
    const cjs = createRequire(import.meta.url)(PACKAGE) as typeof CjsExports;

    assert.deepEqual(Object.keys(esm).sort(), [...API, "default"].sort());
    assert.deepEqual(Object.keys(cjs).sort(), [...API, "default"].sort());
    for (const name of API) {
      assert.equal(
        esm[name as keyof typeof EsmExports],
        cjs[name as keyof typeof CjsExports],
        name,
      );
    }
    assert.equal(esm.default, esm.run);
    assert.equal(cjs.default, cjs.run);
  });

  it("shares registered tests between import and require", async () => {
    const { code, stdout } = await runScript("test/fixtures/mixed-modules.mjs");
    assert.equal(code, 0, stdout);
    assert.match(stdout, /^All 2 tests passed, good vibes :\)$/m);
  });

  it("supports CommonJS with destructured require", async () => {
    const { code, stdout } = await runScript("test/fixtures/commonjs.cjs");
    assert.equal(code, 0, stdout);
    assert.match(stdout, /^All 1 tests passed, good vibes :\)$/m);
  });
});
