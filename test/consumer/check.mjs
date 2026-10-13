// Checks good-vibes works for a project set up like glitch-db (an ES module
// package with TypeScript tests that Node.js runs directly): packs good-vibes,
// installs the tarball in a copy of ./template and runs the checks below.
//
// Usage: npm run test:consumer [-- --keep]
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TEMPLATE = path.join(import.meta.dirname, "template");
const keep = process.argv.includes("--keep");
const workDirectory = mkdtempSync(path.join(tmpdir(), "good-vibes-consumer-"));
const project = path.join(workDirectory, "project");

const run = (command, args, { cwd = project, env = {}, stdio } = {}) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: undefined,
      FORCE_COLOR: undefined,
      ...env,
    },
    stdio,
  });
  if (result.error) {
    throw result.error;
  }
  return {
    code: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
};

// Runs a command installed in the project like npm scripts do, which also puts
// the project's commands on the PATH (c8 needs it to start good-vibes)
const bin = (name, args, { env = {}, ...options } = {}) => {
  const commands = path.join(project, "node_modules", ".bin");
  return run(path.join(commands, name), args, {
    ...options,
    env: { PATH: `${commands}${path.delimiter}${process.env.PATH}`, ...env },
  });
};

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

const expect = (condition, message, output) => {
  if (!condition) {
    throw new Error(output ? `${message}\n\n${output}` : message);
  }
};

const expectCode = ({ code, output }, expected) =>
  expect(
    code === expected,
    `Expected return code ${expected}, got ${code}`,
    output,
  );

check("tsc passes", () => {
  expectCode(bin("tsc", []), 0);
});

check("tsc passes with skipLibCheck disabled", () => {
  expectCode(bin("tsc", ["--skipLibCheck", "false"]), 0);
});

check("eslint passes with recommendedTypeChecked", () => {
  expectCode(bin("eslint", ["."]), 0);
});

check("runs the test files matching the glob, but not helpers.ts", () => {
  const result = bin("good-vibes", ["test/**/*.test.ts"]);
  expectCode(result, 0);
  expect(
    result.output.includes("Running tests in test/a.test.ts"),
    "a.test.ts did not run",
    result.output,
  );
  expect(
    result.output.includes("Running tests in test/b.test.ts"),
    "b.test.ts did not run",
    result.output,
  );
  expect(
    !result.output.includes("Running tests in test/helpers.ts"),
    "helpers.ts ran as a test file",
    result.output,
  );
  expect(
    !result.output.includes(".variant.ts"),
    "a variant ran",
    result.output,
  );
  expect(
    result.output.includes("All 8 tests passed"),
    "Expected 8 passing tests",
    result.output,
  );
});

check("has no ANSI escape codes when output is redirected to a file", () => {
  const file = path.join(workDirectory, "output.txt");
  const descriptor = openSync(file, "w");
  const result = bin("good-vibes", ["test/**/*.test.ts"], {
    stdio: ["ignore", descriptor, descriptor],
  });
  const output = readFileSync(file, "utf8");
  expectCode({ ...result, output }, 0);
  expect(!output.includes("\x1b["), "Found ANSI escape codes", output);
});

check("c8 reports coverage of src/", () => {
  const result = bin("c8", [
    "--include",
    "src/**",
    "good-vibes",
    "test/**/*.test.ts",
  ]);
  expectCode(result, 0);
  const row = result.output
    .split("\n")
    .find((line) => line.includes("store.ts"));
  expect(
    row !== undefined,
    "store.ts is missing from the coverage report",
    result.output,
  );
  const statements = Number(row.split("|")[1]);
  expect(
    statements > 0,
    `Expected coverage of store.ts, got ${statements}%`,
    result.output,
  );
});

check(
  "a failing assertion fails the run, is reported and cleanup still runs",
  () => {
    const record = path.join(workDirectory, "directory.txt");
    const result = bin("good-vibes", ["test/fail.variant.ts"], {
      env: { TEMP_DIRECTORY_RECORD: record },
    });
    expectCode(result, 1);
    expect(
      result.output.includes("Expected values to be strictly deep-equal"),
      "The assertion diff is missing",
      result.output,
    );
    expect(
      result.output.includes(
        "1. test/fail.variant.ts › failing › strict deep equality (Expected values to be strictly deep-equal:)",
      ),
      "The failure summary is missing",
      result.output,
    );
    const directory = readFileSync(record, "utf8");
    expect(
      !existsSync(directory),
      `The after script did not remove ${directory}`,
    );
  },
);

check("a test that never finishes times out", () => {
  const result = bin("good-vibes", [
    "--timeout",
    "500",
    "test/hang.variant.ts",
  ]);
  expectCode(result, 1);
  expect(
    result.output.includes(
      "test/hang.variant.ts › Default › never finishes (Timed out after 500 ms)",
    ),
    "The timeout is not reported",
    result.output,
  );
});

let failed = 0;
try {
  console.log(`Node.js ${process.version}, working in ${workDirectory}\n`);
  expectCode(run("npm", ["run", "build"], { cwd: ROOT }), 0);
  const pack = run(
    "npm",
    ["pack", "--json", "--ignore-scripts", "--pack-destination", workDirectory],
    { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"] },
  );
  expectCode(pack, 0);
  const [{ filename }] = JSON.parse(pack.output);
  cpSync(TEMPLATE, project, { recursive: true });
  const install = run("npm", [
    "install",
    "--no-audit",
    "--no-fund",
    path.join(workDirectory, filename),
  ]);
  expectCode(install, 0);

  for (const { name, fn } of checks) {
    try {
      fn();
      console.log(`✔ ${name}`);
    } catch (error) {
      failed++;
      console.log(`✖ ${name}\n${error.message}\n`);
    }
  }
} finally {
  if (keep) {
    console.log(`\nKept ${workDirectory}`);
  } else {
    rmSync(workDirectory, { recursive: true, force: true });
  }
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exitCode = failed ? 1 : 0;
