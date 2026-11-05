import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'reports/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/core/**/*.ts', 'src/simulation/**/*.ts', 'src/app/session.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['pixi.js', '**/rendering/**', '**/ui/**', '**/input/**'],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'performance', 'Date'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random' }],
    },
  },
];
