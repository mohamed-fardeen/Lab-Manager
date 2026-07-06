/**
 * ESLint configuration for lab-screenshot-manager.
 *
 * Uses plugins already declared in package.json devDependencies
 * (eslint 8.x legacy config format — not flat config).
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint", "react-refresh"],
  ignorePatterns: [
    "dist",
    "node_modules",
    "playwright-report",
    "test-results",
    "server/scripts/**",
    "scratch/**",
    "*.cjs",
    ".eslintrc.cjs",
  ],
  rules: {
    // React Refresh: warn (not error) so Vite HMR-friendly exports don't break CI.
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    // Common in this codebase; warn rather than error.
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-empty-function": "warn",
    // Empty interfaces are used for prop typing in React components.
    "@typescript-eslint/no-empty-interface": "off",
    // Allow non-null assertions used in initialization (e.g. `getElementById('root')!`).
    "@typescript-eslint/no-non-null-assertion": "off",
  },
  overrides: [
    {
      // Backend scripts, vitest specs, and playwright specs run in Node, not the browser.
      files: ["tests/**/*.ts", "e2e/**/*.ts", "server/**/*.ts"],
      env: { node: true, browser: false },
      rules: {
        "@typescript-eslint/no-require-imports": "off",
      },
    },
    {
      // Config files at the root may use any.
      files: ["*.config.ts", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};