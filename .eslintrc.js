module.exports = {
  parser: "@typescript-eslint/parser",
  extends: ["eslint:recommended"],
  env: {
    node: true,
    jest: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    "no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        args: "after-used",
      },
    ],
    "no-undef": "off", // TypeScript handles type checking
    "no-console": "off",
    "prefer-const": "error",
  },
  overrides: [
    {
      files: ["**/IProvider.ts", "**/BaseProvider.ts"],
      rules: {
        "no-unused-vars": "off", // Allow unused params in abstract/interface methods
      },
    },
  ],
  ignorePatterns: [".eslintrc.js", "dist/", "node_modules/", "**/*.js"],
};
