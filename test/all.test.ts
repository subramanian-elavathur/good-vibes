import "./simple.test";
import "./groups.test";
import "./concise-groups.test";
import "./snapshot.test";
import "./synchronous.test";
import "./failing.test"; // uncomment to see failing test behavior
// require("./debug.test"); // uncomment to see debug test behavior
import run from "../src/index";

run({ returnCodeOnFailure: 0 });

// Possible options to run command include
// {
//   timeout: 1000, // in milliseconds
//   snapshotsDirectory: "path", // string
// }
