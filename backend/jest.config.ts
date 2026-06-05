import type { Config } from 'jest';

const generatedOutputIgnorePatterns = [
  '<rootDir>/dist/',
  '<rootDir>/coverage/',
];

const config: Config = {
  rootDir: '.',

  moduleFileExtensions: ['js', 'json', 'ts'],

  testEnvironment: 'node',

  // Coverage is opt-in via `jest --coverage` / `npm run test:cov`.
  // Integration and e2e suites should not write coverage reports by default.
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['lcov', 'text'],
  modulePathIgnorePatterns: generatedOutputIgnorePatterns,
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
      setupFiles: ['<rootDir>/test/jest.setup.js'],
      modulePathIgnorePatterns: generatedOutputIgnorePatterns,
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
      },
    },

    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/**/*.integration-spec.ts'],
      setupFiles: ['<rootDir>/test/jest.setup.js'],
      modulePathIgnorePatterns: generatedOutputIgnorePatterns,
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
      },
    },

    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      setupFiles: ['<rootDir>/test/jest.setup.js'],
      modulePathIgnorePatterns: generatedOutputIgnorePatterns,
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
      },
    },
  ],
};

export default config;
