import { group } from "../src";

// call sync("groupname") to make all tests in the group
// run synchronously. If you dont specify a group name the
// default group tests will run synchronously
// the group shorthand also returns the sync function
// wrapped with groupname

const UNDERDOG = "Underdog";
const { before, test, after, sync } = group(UNDERDOG);

let strings;

before((ctx) => {
  strings = ["good"];
  ctx.done();
});

sync(); // before and after always run synchronously

test("good vibes passthrough", (ctx) => {
  strings.push("vibes");
  ctx.done();
});

test("good vibes", (ctx) => {
  ctx.check("good vibes", strings.join(" ")).done();
});

test("good vibes all", (ctx) => {
  setTimeout(() => {
    strings.push("all");
    ctx.check("good vibes all", strings.join(" ")).done();
  }, 2000);
});

test("good vibes all around", (ctx) => {
  strings.push("around");
  ctx.check("good vibes all around", strings.join(" ")).done();
});

after((ctx) => {
  strings = undefined;
  ctx.done();
});
