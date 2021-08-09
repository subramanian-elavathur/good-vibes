const { before, test, DEBUG } = require("../lib/index");

// When running in debug mode only tests tagged with DEBUG group are run, all other tests are skipped
// Good vibes also exits with a return code of 1 to prevent tests from being, checked into your codebase accidentally

before((done, log) => {
  log("You can run before and after blocks even in debug mode");
  done();
}, DEBUG);

test(
  "Johnny Cash",
  (verify, log) => {
    setTimeout(() => {
      log("Hurt");
      verify.check(1, 1).done();
    }, 2000);
  },
  DEBUG
);
