// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Prisma generated client must be excluded — it's auto-generated code that does
    // not conform to our ESLint rules ({}  types, unused vars, etc.). Modifying it
    // is pointless as prisma generate overwrites it on every run.
    ignores: ['eslint.config.mjs', 'src/generated/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      // RF-06: $queryRawUnsafe is forbidden — use prisma.$queryRaw tagged template only
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='$queryRawUnsafe']",
          message:
            'prisma.$queryRawUnsafe is forbidden (SQL injection risk). Use prisma.$queryRaw`...` tagged template instead.',
        },
        {
          selector:
            "CallExpression[callee.computed=true][callee.property.value='$queryRawUnsafe']",
          message:
            'prisma.$queryRawUnsafe is forbidden (SQL injection risk). Use prisma.$queryRaw`...` tagged template instead.',
        },
        {
          selector:
            "ChainExpression > CallExpression[callee.property.name='$queryRawUnsafe']",
          message:
            'prisma.$queryRawUnsafe is forbidden (SQL injection risk). Use prisma.$queryRaw`...` tagged template instead.',
        },
        {
          selector:
            "ChainExpression > CallExpression[callee.computed=true][callee.property.value='$queryRawUnsafe']",
          message:
            'prisma.$queryRawUnsafe is forbidden (SQL injection risk). Use prisma.$queryRaw`...` tagged template instead.',
        },
      ],
    },
  },
  {
    files: ['src/**/domain/**/*.ts', 'src/**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@nestjs/*',
                '@prisma/*',
                'src/generated/*',
                '**/generated/prisma',
                '**/generated/prisma/*',
                '**/shared/infrastructure/*',
                '**/infrastructure/*',
              ],
              message:
                'Domain and application layers must stay framework-agnostic. Move NestJS, Prisma, and infrastructure imports to infrastructure/presentation.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/*/{domain,application}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../../auth/*',
                '../../documents/*',
                '../../users/*',
                '../../ai/*',
                '../../mcp/*',
                '../../../auth/*',
                '../../../documents/*',
                '../../../users/*',
                '../../../ai/*',
                '../../../mcp/*',
                '../../../../auth/*',
                '../../../../documents/*',
                '../../../../users/*',
                '../../../../ai/*',
                '../../../../mcp/*',
              ],
              message:
                'Cross-slice imports from domain/application are forbidden. Extract a shared contract or depend on a local port.',
            },
          ],
        },
      ],
    },
  },
  // Specific rules for test files
  // Relax some rules in test files to allow for more flexible testing patterns, such as using `any` for mocks or allowing unsafe calls that are common in tests.
  {
    files: [
      '**/*.spec.ts',
      '**/*.integration-spec.ts',
      '**/*.test.ts',
      '**/*.e2e-spec.ts',
      '**/test/**',
      '**/e2e/**',
    ],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.spec.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
