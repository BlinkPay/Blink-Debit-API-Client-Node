/**
 * Unit tests for Configuration class
 */

import {Configuration} from '../../configuration';
import {TokenAPI} from '../../src/client/v1/token-api';
import {BlinkInvalidValueException} from '../../src/exceptions';
import axios, {AxiosInstance} from 'axios';

describe('Configuration', () => {
    let axiosInstance: AxiosInstance;

    beforeEach(() => {
        axiosInstance = axios.create();
        // Clear environment variables
        delete process.env.BLINKPAY_DEBIT_URL;
        delete process.env.BLINKPAY_CLIENT_ID;
        delete process.env.BLINKPAY_CLIENT_SECRET;
        delete process.env.BLINKPAY_TIMEOUT;
        delete process.env.BLINKPAY_RETRY_ENABLED;
    });

    describe('Constructor with config object', () => {
        it('should create configuration with valid config object', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    timeout: 5000,
                    retryEnabled: true
                }
            };

            const configuration = new Configuration(axiosInstance, config);

            expect(configuration.debitUrl).toBe('https://sandbox.debit.blinkpay.co.nz');
            expect(configuration.clientId).toBe('test-client-id');
            expect(configuration.clientSecret).toBe('test-client-secret');
            expect(configuration.basePath).toBe('https://sandbox.debit.blinkpay.co.nz/payments/v1');
        });

        it('should throw error when debitUrl is missing', () => {
            const config = {
                blinkpay: {
                    debitUrl: '',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret'
                }
            };

            expect(() => {
                new Configuration(axiosInstance, config);
            }).toThrow(BlinkInvalidValueException);
        });

        it('should throw error when clientId is missing', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                    clientId: '',
                    clientSecret: 'test-client-secret'
                }
            };

            expect(() => {
                new Configuration(axiosInstance, config);
            }).toThrow(BlinkInvalidValueException);
        });

        it('should throw error when clientSecret is missing', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                    clientId: 'test-client-id',
                    clientSecret: ''
                }
            };

            expect(() => {
                new Configuration(axiosInstance, config);
            }).toThrow(BlinkInvalidValueException);
        });
    });

    describe('Constructor with environment variables', () => {
        it('should create configuration from environment variables', () => {
            process.env.BLINKPAY_DEBIT_URL = 'https://sandbox.debit.blinkpay.co.nz';
            process.env.BLINKPAY_CLIENT_ID = 'env-client-id';
            process.env.BLINKPAY_CLIENT_SECRET = 'env-client-secret';

            const configuration = new Configuration(axiosInstance);

            expect(configuration.debitUrl).toBe('https://sandbox.debit.blinkpay.co.nz');
            expect(configuration.clientId).toBe('env-client-id');
            expect(configuration.clientSecret).toBe('env-client-secret');
        });

        it('should throw error when required env vars are missing', () => {
            expect(() => {
                new Configuration(axiosInstance);
            }).toThrow(BlinkInvalidValueException);
        });
    });

    describe('Timeout configuration', () => {
        it('should use default timeout when not specified', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret'
                }
            };

            const configuration = new Configuration(axiosInstance, config);

            // Access the private _timeout via the axios instance config
            expect(axiosInstance.defaults.timeout).toBe(10000);
        });

        it('should use specified timeout', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    timeout: 30000
                }
            };

            const configuration = new Configuration(axiosInstance, config);

            expect(axiosInstance.defaults.timeout).toBe(30000);
        });

        it('should handle invalid timeout string', () => {
            process.env.BLINKPAY_DEBIT_URL = 'https://sandbox.debit.blinkpay.co.nz';
            process.env.BLINKPAY_CLIENT_ID = 'test-client-id';
            process.env.BLINKPAY_CLIENT_SECRET = 'test-client-secret';
            process.env.BLINKPAY_TIMEOUT = 'invalid';

            const configuration = new Configuration(axiosInstance);

            // Should default to 10000 when invalid
            expect(axiosInstance.defaults.timeout).toBe(10000);
        });
    });

    describe('TokenAPI integration', () => {
        it('should create TokenAPI instance', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret'
                }
            };

            const configuration = new Configuration(axiosInstance, config);

            expect(configuration.tokenApi).toBeInstanceOf(TokenAPI);
        });

        it('should return same TokenAPI instance (singleton)', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret'
                }
            };

            const configuration = new Configuration(axiosInstance, config);

            const tokenApi1 = configuration.tokenApi;
            const tokenApi2 = configuration.tokenApi;

            expect(tokenApi1).toBe(tokenApi2);
        });
    });

    describe('ExpirationDate initialization', () => {
        it('should initialize expirationDate to epoch 0', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret'
                }
            };

            const configuration = new Configuration(axiosInstance, config);

            expect(configuration.expirationDate).toEqual(new Date(0));
        });
    });

    describe('Retry policy configuration', () => {
        it('should enable retry policy by default', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret'
                }
            };

            const configuration = new Configuration(axiosInstance, config);

            expect(configuration.retryPolicy).toBeDefined();
        });

        it('should respect retryEnabled false from config', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    retryEnabled: false
                }
            };

            const configuration = new Configuration(axiosInstance, config);

            expect(configuration.retryPolicy).toBeUndefined();
        });
    });

    describe('Base path generation', () => {
        it('should generate correct base path', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret'
                }
            };

            const configuration = new Configuration(axiosInstance, config);

            expect(configuration.basePath).toBe('https://sandbox.debit.blinkpay.co.nz/payments/v1');
        });

        it('should handle debitUrl without trailing slash', () => {
            const config = {
                blinkpay: {
                    debitUrl: 'https://sandbox.debit.blinkpay.co.nz/',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret'
                }
            };

            const configuration = new Configuration(axiosInstance, config);

            expect(configuration.basePath).toBe('https://sandbox.debit.blinkpay.co.nz//payments/v1');
        });
    });
});
