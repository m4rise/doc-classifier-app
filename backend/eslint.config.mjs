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
);
