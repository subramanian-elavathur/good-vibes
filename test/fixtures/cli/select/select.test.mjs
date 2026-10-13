import { group, test } from "good-vibes";

const fruits = group("Fruits");
fruits.test("apple", () => {});
fruits.test("banana", () => {});

group("Vegetables").test("carrot", () => {});

test("pumpkin", () => {}, { skip: "not in season" });
