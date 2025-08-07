// .eslintrc.js
export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "arrow-spacing": "error",
      "prefer-template": "error",
      "template-curly-spacing": "error",
      "no-trailing-spaces": "error",
      "eol-last": "error",
      "comma-dangle": ["error", "never"],
      "semi": ["error", "always"],
      "quotes": ["error", "single"],
      "indent": ["error", 2],
      "no-multiple-empty-lines": ["error", { max: 1 }]
    }
  },
  {
    files: ["src/test/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        jest: "readonly"
      }
    },
    rules: {
      "no-console": "off"
    }
  }
];
