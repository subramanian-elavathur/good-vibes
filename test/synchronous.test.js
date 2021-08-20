const { group } = require("../lib/index");

// call sync("groupname") to make all tests in the group
// run synchronously. If you dont specify a group name the
// default group tests will run synchronously
// the group shorthand also returns the sync function
// wrapped with groupname

const UNDERDOG = "Underdog";
const { before, test, after, sync } = group(UNDERDOG);

let strings;

before((done) => {
  strings = ["good"];
  done();
});

sync(); // before and after always run synchronously

test("good vibes", (verify) => {
  strings.push("vibes");
  verify.check("good vibes", strings.join(" ")).done();
});

test("good vibes all", (verify) => {
  setTimeout(() => {
    strings.push("all");
    verify.check("good vibes all", strings.join(" ")).done();
  }, 2000);
});

test("good vibes all around", (verify) => {
  strings.push("around");
  verify.check("good vibes all around", strings.join(" ")).done();
});

after((done) => {
  strings = undefined;
  done();
});
