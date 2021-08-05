require("./simple.test");
require("./groups.test");
require("./concise-groups.test");
// require("./failing.test"); // uncomment to see failing test behavior
const run = require("../lib/index").default;

run();
