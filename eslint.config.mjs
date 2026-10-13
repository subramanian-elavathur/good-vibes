import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["lib/", "coverage/", "test-results/"]),
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,mts,cts}"],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["test/**/*.mts"],
    rules: {
      // describe() and it() from node:test return promises that never need awaiting
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          allowForKnownSafeCalls: [
            { from: "package", package: "node:test", name: ["describe", "it"] },
          ],
        },
      ],
    },
  },
  prettier,
]);
