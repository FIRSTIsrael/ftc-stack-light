module.exports = {
  env: {
    commonjs: true,
    es6: true
  },
  extends: ['google'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    'object-curly-spacing': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'require-jsdoc': 0,
    indent: 'off',
    'max-len': ['warn', { code: 120, tabWidth: 2 }]
  }
};
