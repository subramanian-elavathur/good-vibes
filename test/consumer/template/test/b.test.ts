import { after, before, test, type TestContext } from "good-vibes";
import Store from "../src/store.ts";
import { createTempDir, removeTempDir } from "./helpers.ts";

let directory: string;
let db: Store<string>;

before(async () => {
  directory = await createTempDir("b");
  db = new Store(directory);
});

after(() => removeTempDir(directory));

test("context assertions", async (ctx: TestContext) => {
  await db.set("song", "Fallin'");
  ctx.check("Fallin'", await db.get("song"));
  ctx.check(true, (await db.keys()).includes("song"));
  ctx.throws(() => db.pathOf("a/b"), "Invalid key a/b");
  await ctx.rejects(db.load("nope"), /not found/);
});
