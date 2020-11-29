module.exports = {
  'env': {
    'commonjs': true,
    'es6': true,
  },
  'extends': [
    'google',
  ],
  'globals': {
    'Atomics': 'readonly',
    'SharedArrayBuffer': 'readonly',
  },
  'parserOptions': {
    'ecmaVersion': 2018,
  },
  'rules': {
    'comma-dangle': ['error', 'never'],
    'require-jsdoc': 0,
    'max-len': ['warn', { 'code': 135, 'tabWidth': 2 }]
  }
};
