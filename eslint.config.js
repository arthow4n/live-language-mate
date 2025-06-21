import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
// import jsdoc from 'eslint-plugin-jsdoc';
// import testingLibrary from 'eslint-plugin-testing-library';
// import perfectionist from 'eslint-plugin-perfectionist';

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  prettierConfig,
  comments.recommended,
  // jsdoc.configs['flat/recommended-typescript-error'],
  // testingLibrary.configs['flat/react'],
  reactHooks.configs['recommended-latest'],
  {
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    files: ['**/*.{ts,tsx}'],
    // Leave Deno for Deno lint
    ignores: ['api/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@eslint-community/eslint-comments/no-unused-disable': 'error',
      '@eslint-community/eslint-comments/require-description': [
        'error',
        { ignore: [] },
      ],

      // "@typescript-eslint/explicit-function-return-type": "error"
      // '@typescript-eslint/ban-ts-comment': 'error',
      // '@typescript-eslint/consistent-type-assertions': [
      //   'error',
      //   {
      //     arrayLiteralTypeAssertions: 'allow',
      //     assertionStyle: 'never',
      //     objectLiteralTypeAssertions: 'allow',
      //   },
      // ],
      // '@typescript-eslint/no-import-type-side-effects': 'error',
      // '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // '@typescript-eslint/consistent-type-imports': [
      //   'error',
      //   {
      //     fixStyle: 'separate-type-imports',
      //   },
      // ],
    },
  }
  // perfectionist.configs['recommended-natural'],
);
