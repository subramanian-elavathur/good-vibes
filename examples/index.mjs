// Runs the examples with `npm run examples`.
//
// Test files only register tests, so a single entry point can import as many
// of them as needed and then call run() once.
import run from "good-vibes";
import "./simple.test.mjs";
import "./groups.test.mjs";
import "./concise-groups.test.mjs";
import "./snapshot.test.mjs";
import "./synchronous.test.mjs";
// import "./failing.test.mjs"; // uncomment to see failing test behavior
// import "./debug.test.mjs"; // uncomment to see debug mode behavior

run({
  // Relative to the directory you run the tests from
  snapshotsDirectory: "examples/__snapshots__",
});
