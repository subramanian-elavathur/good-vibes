// Not matched by test/**/*.test.ts, check.mjs runs it to check timeouts
import { test } from "good-vibes";

test("never finishes", () => new Promise<void>(() => undefined));
