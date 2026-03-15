import coreWebVitals from 'eslint-config-next/core-web-vitals';
import tsConfig from 'eslint-config-next/typescript';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...coreWebVitals,
  ...tsConfig,
  {
    ignores: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
  },
];
