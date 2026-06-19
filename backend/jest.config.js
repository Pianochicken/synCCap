/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    /* Map codegen packages to their local file paths */
    '^@daml\\.js/synccap-0\\.1\\.0$': '<rootDir>/daml.js/synccap-0.1.0/lib',
    '^@daml\\.js/synccap-0\\.1\\.0/(.*)$': '<rootDir>/daml.js/synccap-0.1.0/$1',
    '^@daml\\.js/ghc-stdlib-DA-Internal-Template-1\\.0\\.0$':
      '<rootDir>/daml.js/ghc-stdlib-DA-Internal-Template-1.0.0/lib',
    '^@daml\\.js/ghc-stdlib-DA-Internal-Template-1\\.0\\.0/(.*)$':
      '<rootDir>/daml.js/ghc-stdlib-DA-Internal-Template-1.0.0/$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          /* Relax strict checks for test files */
          noUnusedLocals: false,
          noUnusedParameters: false,
          strict: true,
        },
      },
    ],
  },
  /* Tests run sequentially because they share ledger state */
  maxWorkers: 1,
  /* Timeout for ledger integration tests (Canton commands can be slow) */
  testTimeout: 30000,
};
