
// Use CommonJS style imports instead of ESM to avoid package resolution issues
const globals = require("globals");
const tseslint = require("typescript-eslint");

// Use more direct access to plugins
module.exports = [
  { ignores: ["dist"] },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: "./tsconfig.json"
      }
    },
    // Use built-in recommended rules
    rules: {
      // Basic ESLint rules
      "no-unused-vars": "off",
      "no-console": "warn",
      
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": "off",
      
      // React rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    }
  }
];
