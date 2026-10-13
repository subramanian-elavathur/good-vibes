import run, { test } from "good-vibes";
import { options } from "./options.mjs";

const rebase = process.env.REBASE === "true";

test("Album", async (ctx) => {
  const songs = {
    title: "Here",
    year: 2016,
    tracks: ["The Gospel", "Pawn It All", "Holy War"],
  };
  await ctx.snapshot("Songs", songs, rebase);
  ctx.done();
});

run(options);
