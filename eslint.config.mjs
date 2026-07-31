import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// ESLint flat config.
//
// `next lint` was removed in Next 16 and the npm script still pointed at it, so
// this project had never actually been linted. ESLint runs directly now.
//
// eslint-config-next 16 ships native flat configs, so they are spread straight
// in — wrapping them in FlatCompat (the older recipe) throws "Converting
// circular structure to JSON" because the plugin objects self-reference.

const config = [
  {
    // Build output, deps, and the archived design-handoff bundles — those carry
    // vendored HTML/JS and are reference material, not source.
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'maharshi-simran-wedding/**',
      'Design review brief/**',
      'Simvites Event Platform Blueprint/**',
      'Wedding platform design overhaul/**',
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Unused vars are a real signal, but the leading-underscore escape hatch
      // matters for deliberately-ignored callback args and destructured rests.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
        ignoreRestSiblings: true,
      }],

      // ── Existing debt, deliberately WARN rather than off ──────────────────
      // The React Compiler rules land 36 findings on a codebase written before
      // they existed. They are real — components declared inside other
      // components remount on every parent render, and writing a ref during
      // render is a genuine hazard — but clearing them means hoisting 21
      // components out of their parents, mostly in the website editor and the
      // admin directory. That is a refactor with real regression risk in the
      // least-verifiable code in the app, not a lint tidy-up.
      //
      // So: visible on every run, and BUDGETED. `npm run lint` fails if the
      // count rises above the current 36 (see the --max-warnings in the
      // script), which means the debt can shrink but never grow. Fix a file's
      // worth at a time and lower the number.
      'react-hooks/static-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
]

export default config
