import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Build output and the native projects Capacitor generates are not linted.
  { ignores: ['dist/', 'android/', 'ios/', 'node_modules/', 'test-results/', 'playwright-report/', 'public/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
