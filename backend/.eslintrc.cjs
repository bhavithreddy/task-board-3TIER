module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2024: true,
  },
  extends: ["eslint:recommended", "plugin:node/recommended", "prettier"],
  parserOptions: {
    ecmaVersion: 2024,
  },
  rules: {
    "no-console": "off",
    "node/no-unsupported-features/es-syntax": "off",
  },
};
