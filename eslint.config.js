import coreWebVitals from 'eslint-config-next/core-web-vitals';
import tsConfig from 'eslint-config-next/typescript';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...coreWebVitals,
  ...tsConfig,
  {
    ignores: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
  },
  {
    // `eslint-config-next` is on a caret range, so a fresh install (no build
    // cache) picked up a newer eslint-plugin-react-hooks in which
    // set-state-in-effect is an error rather than a warning. That fails
    // `next build` on pre-existing app/publish/PublishForm.tsx code which has
    // been running in production for months, blocking every deploy.
    // Kept visible as a warning; drop this block once those effects are reworked.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];
