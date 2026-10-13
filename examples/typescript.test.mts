// TypeScript test files run directly with Node.js' built-in type stripping
import assert from "node:assert/strict";
import { group, type TestContext } from "good-vibes";

interface Song {
  title: string;
  year: number;
}

const expectSong = (ctx: TestContext, song: Song, title: string) =>
  ctx.check(title, song.title);

const songs = group("Songs in A Minor");

songs.test("Fallin'", (ctx) => {
  expectSong(ctx, { title: "Fallin'", year: 2001 }, "Fallin'").done();
});

songs.test("A Woman's Worth", async () => {
  const song: Song = await Promise.resolve({
    title: "A Woman's Worth",
    year: 2001,
  });
  assert.equal(song.year, 2001);
});
