import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Ignore compiled output and third-party directories
  globalIgnores(['dist', 'frontend/.next', 'frontend/node_modules', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Prevent raw console.log leaking into production builds.
      // Use the structured logger (src/lib/logger.ts) for debug/info output.
      // console.error and console.warn remain allowed for error boundaries and
      // the logger's own console output method.
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  // The logger implementation itself must call raw console methods — allow all.
  {
    files: ['src/lib/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  // Test files may use console.log freely for diagnostic output.
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: { 'no-console': 'off' },
  },
])
