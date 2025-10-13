import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/?(*.)+(spec|test).ts?(x)', '**/integrationTests/**/*.[jt]s?(x)'],

    // 1) TS is compiled by ts-jest in ESM mode
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.json' }],
        // 2) JS (including node_modules/uuid) is compiled by babel-jest
        '^.+\\.(js|jsx)$': 'babel-jest',
    },

    // 3) Allow transforming ESM deps in node_modules (uuid)
    transformIgnorePatterns: ['/node_modules/(?!(uuid)/)'],

    // 4) Treat TS as ESM in Jest’s runtime
    extensionsToTreatAsEsm: ['.ts'],

    // 5) Help Jest resolve ESM “.js” extension emitted by TS in relative imports
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};

export default config;
