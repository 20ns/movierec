module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  globals: {
    gtag: 'readonly', // Google Analytics
    React: 'readonly', // React global
  },
  extends: [
    // Removed 'eslint:recommended' to reduce noise
    'plugin:react/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-hooks',
  ],
  rules: {
    // React specific rules (lenient)
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off', // Too noisy for existing code
    'react/no-unescaped-entities': 'off',
    'react/display-name': 'off',
    
    // Only critical errors
    'no-unused-vars': 'off', // Too noisy for existing code
    'no-console': 'off', // Allow console.log for now
    'no-debugger': 'error', // Keep this - debugger statements should be removed
    'no-alert': 'off',
    
    // No style rules for now - too many existing violations
    'indent': 'off',
    'quotes': 'off', 
    'semi': 'off',
    'comma-dangle': 'off',
    'object-curly-spacing': 'off',
    'array-bracket-spacing': 'off',
    'no-trailing-spaces': 'off',
    'eol-last': 'off',
    
    // Keep only critical security/safety rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-undef': 'error', // Catch undefined variables
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.test.jsx'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['lambda-functions/**/*.js'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        'no-console': 'off', // Allow console.log in Lambda functions
      },
    },
    {
      files: ['infrastructure/**/*.js', 'infrastructure/**/*.ts'],
      env: {
        node: true,
        browser: false,
      },
    },
  ],
};