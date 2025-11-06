/**
 * Unit tests for TokenAPI class
 */

import {TokenAPI} from '../../src/client/v1/token-api';
import {Configuration} from '../../configuration';
import {BlinkForbiddenException, BlinkServiceException} from '../../src/exceptions';
import axios, {AxiosInstance} from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('TokenAPI', () => {
    let axiosInstance: AxiosInstance;
    let configuration: Configuration;
    let tokenApi: TokenAPI;
    let mock: MockAdapter;

    beforeEach(() => {
        axiosInstance = axios.create();
        mock = new MockAdapter(axiosInstance);

        const config = {
            blinkpay: {
                debitUrl: 'https://sandbox.debit.blinkpay.co.nz',
                clientId: 'test-client-id',
                clientSecret: 'test-client-secret'
            }
        };

        configuration = new Configuration(axiosInstance, config);
        tokenApi = new TokenAPI(axiosInstance, configuration);
    });

    afterEach(() => {
        mock.reset();
    });

    describe('refreshToken', () => {
        it('should successfully obtain access token from API', async () => {
            const mockResponse = {
                access_token: 'test-access-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(200, mockResponse);

            await tokenApi.refreshToken();

            expect(configuration.accessToken).toBe('test-access-token');
        });

        it('should set expirationDate based on expires_in', async () => {
            const mockResponse = {
                access_token: 'test-access-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            const beforeTime = new Date();
            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(200, mockResponse);

            await tokenApi.refreshToken();

            const afterTime = new Date();
            const expectedMin = new Date(beforeTime.getTime() + 3600 * 1000);
            const expectedMax = new Date(afterTime.getTime() + 3600 * 1000);

            expect(configuration.expirationDate.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
            expect(configuration.expirationDate.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
        });

        it('should throw BlinkForbiddenException on 403 error', async () => {
            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(403, {
                error: 'access_denied'
            });

            await expect(tokenApi.refreshToken()).rejects.toThrow(BlinkForbiddenException);
        });

        it('should throw BlinkRetryableException on 500 errors', async () => {
            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(500, {
                error: 'server_error'
            });

            await expect(tokenApi.refreshToken()).rejects.toThrow('Operation failed and will be retried');
        });

        it('should rethrow errors (critical fix verification)', async () => {
            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(403);

            try {
                await tokenApi.refreshToken();
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(BlinkForbiddenException);
            }
        });
    });

    describe('getAccessToken', () => {
        it('should return existing valid token without refresh', async () => {
            const mockResponse = {
                access_token: 'initial-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(200, mockResponse);

            // First call to get initial token
            await tokenApi.getAccessToken();
            expect(configuration.accessToken).toBe('initial-token');

            // Reset mock to ensure no second call
            mock.reset();
            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(500); // Should not be called

            // Second call should return cached token
            await tokenApi.getAccessToken();
            expect(configuration.accessToken).toBe('initial-token');
        });

        it('should refresh expired token', async () => {
            const firstResponse = {
                access_token: 'first-token',
                token_type: 'Bearer',
                expires_in: 1 // 1 second
            };

            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(200, firstResponse);

            await tokenApi.getAccessToken();
            expect(configuration.accessToken).toBe('first-token');

            // Wait for token to expire
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Setup second response
            const secondResponse = {
                access_token: 'second-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            mock.reset();
            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(200, secondResponse);

            await tokenApi.getAccessToken();
            expect(configuration.accessToken).toBe('second-token');
        });

        it('should refresh token when not yet obtained', async () => {
            // Configuration starts with expirationDate = new Date(0)
            expect(configuration.expirationDate).toEqual(new Date(0));

            const mockResponse = {
                access_token: 'new-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(200, mockResponse);

            await tokenApi.getAccessToken();
            expect(configuration.accessToken).toBe('new-token');
        });

        it('should propagate refresh failures', async () => {
            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(403);

            await expect(tokenApi.getAccessToken()).rejects.toThrow(BlinkForbiddenException);
        });
    });

    describe('Token expiration logic', () => {
        it('should correctly identify expired token', async () => {
            // Set expiration date in the past
            configuration.expirationDate = new Date(Date.now() - 1000);

            const mockResponse = {
                access_token: 'refreshed-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(200, mockResponse);

            await tokenApi.getAccessToken();
            expect(configuration.accessToken).toBe('refreshed-token');
        });

        it('should correctly identify valid token', async () => {
            const mockResponse = {
                access_token: 'initial-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(200, mockResponse);

            // Get initial token
            await tokenApi.getAccessToken();

            // Set mock to fail on second call - should not happen
            mock.reset();
            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(500);

            // Token should still be valid, no refresh should occur
            await tokenApi.getAccessToken();
            expect(configuration.accessToken).toBe('initial-token');
        });
    });

    describe('Error handling', () => {
        it('should wrap 400 errors in BlinkServiceException', async () => {
            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(400, {
                error: 'invalid_request'
            });

            await expect(tokenApi.refreshToken()).rejects.toThrow(BlinkServiceException);
        });

        it('should wrap 401 errors in BlinkServiceException', async () => {
            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(401, {
                error: 'invalid_client'
            });

            await expect(tokenApi.refreshToken()).rejects.toThrow(BlinkServiceException);
        });

        it('should throw BlinkClientException for 400 errors', async () => {
            mock.onPost('https://sandbox.debit.blinkpay.co.nz/oauth2/token').reply(400, {
                error: 'invalid_request',
                error_description: 'Bad request'
            });

            try {
                await tokenApi.refreshToken();
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Client request is invalid');
            }
        });
    });
});
