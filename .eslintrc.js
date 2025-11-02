module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended",
  ],
  plugins: ["@typescript-eslint"],
  env: {
    node: true,
    jest: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    project: "./tsconfig.json",
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
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        args: "after-used",
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
  },
  overrides: [
    {
      files: ["**/IProvider.ts", "**/BaseProvider.ts"],
      rules: {
        "no-unused-vars": "off", // Allow unused params in abstract/interface methods
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
  ],
  ignorePatterns: [".eslintrc.js", "dist/", "node_modules/", "**/*.js"],
};
