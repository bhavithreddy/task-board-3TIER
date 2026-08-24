module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2024: true,
  },
  extends: ['eslint:recommended', 'plugin:n/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 2024,
  },
  rules: {
    'no-console': 'off',
    'n/no-unsupported-features/es-syntax': 'off',
    'n/no-unpublished-require': [
      'error',
      {
        allowModules: ['supertest', 'mongodb-memory-server'],
      },
    ],
  },
  overrides: [
    {
      files: ['src/index.js'],
      rules: {
        'n/no-process-exit': 'off',
      },
    },
  ],
};
