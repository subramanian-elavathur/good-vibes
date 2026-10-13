import { test } from "good-vibes";
import "./missing-module.mjs";

test("never registered", () => {});
