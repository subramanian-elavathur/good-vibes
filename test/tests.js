require("./simple.test");
require("./groups.test");
require("./concise-groups.test");
require("./snapshot.test");
require("./synchronous.test");
require("./failing.test"); // uncomment to see failing test behavior
// require("./debug.test"); // uncomment to see debug test behavior
const run = require("../lib/index").default;

run({ returnCodeOnFailure: 0 });

// Possible options to run command include
// {
//   timeout: 1000, // in milliseconds
//   snapshotsDirectory: "path", // string
// }
