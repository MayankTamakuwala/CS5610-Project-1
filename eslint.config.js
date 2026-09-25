// Placeholder. Replace this file with the class ESLint config before
// submitting, then run `npm run lint` and fix anything it reports.
import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
  },
];
