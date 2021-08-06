require("./simple.test");
require("./groups.test");
require("./concise-groups.test");
// require("./debug.test"); // uncomment to see debug test behavior
// require("./failing.test"); // uncomment to see failing test behavior
const run = require("../lib/index").default;

run();
