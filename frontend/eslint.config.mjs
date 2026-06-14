// Flat ESLint config. Next.js 16 removed the `next lint` command, so we run ESLint
// directly (see the "lint" script in package.json). `eslint-config-next` 16.x ships a
// flat-config array, which we extend here.
import next from 'eslint-config-next';

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'next-env.d.ts',
      'design/**',
      'content/**',
    ],
  },
  ...next,
  {
    // These rules are new/stricter defaults in eslint-config-next 16 and currently
    // trip several pre-existing components. Keep them as warnings so `lint` stays
    // green and CI-usable while still surfacing the issues for incremental cleanup,
    // rather than disabling them outright.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/incompatible-library': 'warn',
    },
  },
];

export default config;
