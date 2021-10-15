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
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  rules: {
    'object-curly-spacing': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'require-jsdoc': 0,
    'quote-props': ['error', 'as-needed'],
    indent: ['error', 2, { SwitchCase: 1 }],
    'max-len': ['warn', { code: 130, tabWidth: 2 }]
  }
};
