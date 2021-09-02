const { before, test, DEBUG } = require("../lib/index");

// When running in debug mode only tests tagged with DEBUG group are run, all other tests are skipped
// Good vibes also exits with a return code of 1 to prevent tests from being, checked into your codebase accidentally

before((ctx) => {
  ctx.log("You can run before and after blocks even in debug mode");
  ctx.done();
}, DEBUG);

test(
  "Johnny Cash",
  (ctx) => {
    setTimeout(() => {
      ctx.log("Hurt");
      ctx.check(1, 1).done();
    }, 2000);
  },
  DEBUG
);
