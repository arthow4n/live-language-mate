import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import path from 'node:path';

/** @type {import("eslint").Linter.Config[]} */
export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  prettierConfig,
  {
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
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
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    // For Deno files, turn off rules which need type information, I don't know how to config this properly yet.
    files: ['api/**/*.ts'],
    extends: [tseslint.configs.strict, tseslint.configs.stylistic],
    languageOptions: {
      // globals: {
      //   ...globals.browser,
      // },
      parserOptions: {
        tsconfigRootDir: path.join(import.meta.dirname, 'api'),
      },
    },
  }
);
