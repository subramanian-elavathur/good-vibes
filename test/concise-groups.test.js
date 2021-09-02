const { group } = require("../lib/index");

// good-vibes also exports a "group" function which wraps the standard
// methods: before, test, and after with group name so your tests can be
// written in a concise manner

const FKJ = "Tadow";
const { before, test, after } = group(FKJ);

let strings;

before((ctx) => {
  strings = ["you", "saw", "and", "it", "hit", "me", "like", "tadow"];
  ctx.done();
});

test("Masego", (ctx) => {
  ctx.check("you saw and it hit me like tadow", strings.join(" ")).done();
});

after((ctx) => {
  strings = undefined;
  ctx.done();
});
