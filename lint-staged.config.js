const prettier = 'prettier --write --ignore-unknown --log-level=silent';

/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '!(*.{ts,tsx,js,jsx})': prettier,
  '*.{ts,tsx,js,jsx}': [
    // Cleanup the code automatically first for LLM
    'npx eslint --fix --quiet',
    () => 'npm run typecheck',
    'npx vitest related --silent=passed-only --exclude="api/**" --run',
    prettier,
  ],
};
