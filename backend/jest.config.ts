import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',

  moduleFileExtensions: ['js', 'json', 'ts'],

  testEnvironment: 'node',

  // COVERAGE GLOBAL (ROOT LEVEL)
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['lcov', 'text'],
  collectCoverageFrom: [
    'src/**/*.ts',

    '!src/**/*.spec.ts',
    '!src/**/*.integration-spec.ts',
    '!src/**/*.e2e-spec.ts',

    '!src/**/*.d.ts',
    '!src/generated/**',
    '!src/main.ts',
    '!src/instrument.ts',
  ],

  // Séparation propre unit vs integration vs e2e
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
      },
    },

    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/**/*.integration-spec.ts'],
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
      },
    },

    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
      },
    },
  ],
};

export default config;
