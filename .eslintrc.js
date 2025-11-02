module.exports = {
  extends: ['eslint:recommended'],
  env: {
    node: true,
    jest: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'error',
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/', '**/*.js'],
};