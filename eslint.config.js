import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import jsdoc from 'eslint-plugin-jsdoc';
import perfectionist from 'eslint-plugin-perfectionist';
import reactHooks from 'eslint-plugin-react-hooks';
// import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  prettierConfig,
  comments.recommended,
  jsdoc.configs['flat/recommended-typescript-error'],
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

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'separate-type-imports',
        },
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
      // '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // Configure JSDoc to be less strict for UI components
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: [
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSEnumDeclaration',
          ],
          require: {
            ArrowFunctionExpression: false,
            ClassDeclaration: true,
            ClassExpression: false,
            FunctionDeclaration: true,
            FunctionExpression: false,
            MethodDefinition: false,
          },
        },
      ],
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns': 'off', // TypeScript provides return type info
      'jsdoc/require-returns-description': 'off',
    },
  },
  perfectionist.configs['recommended-natural']
);
