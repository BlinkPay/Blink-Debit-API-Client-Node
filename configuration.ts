/**
 * Copyright (c) 2023 BlinkPay
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import {AxiosInstance, AxiosRequestConfig} from 'axios';
import {AccessTokenResponse} from './src/dto/v1/access-token-response';
import qs from 'qs';
import {camelizeKeys, decamelizeKeys} from 'humps';
import {
    BlinkClientException,
    BlinkForbiddenException,
    BlinkNotImplementedException,
    BlinkRateLimitExceededException,
    BlinkResourceNotFoundException,
    BlinkRetryableException,
    BlinkServiceException,
    BlinkUnauthorisedException
} from './src';
import {ExponentialBackoff, handleType, retry, RetryPolicy} from 'cockatiel';
import {BlinkPayConfig} from './blinkpay-config';
import log from 'loglevel';

if (typeof process !== 'undefined') {
    require('dotenv').config();
}

/**
 * The configuration.
 */
export class Configuration {
    /**
     * parameter for apiKey security
     *
     * @param name security name
     * @memberof Configuration
     */
    apiKey?: string | Promise<string> | ((name: string) => string) | ((name: string) => Promise<string>);
    /**
     * parameter for basic security
     *
     * @type {string}
     * @memberof Configuration
     */
    username?: string;
    /**
     * parameter for basic security
     *
     * @type {string}
     * @memberof Configuration
     */
    password?: string;
    /**
     * parameter for OAuth2 security
     *
     * @param name security name
     * @param scopes oauth2 scope
     * @memberof Configuration
     */
    accessToken?: string | Promise<string> | ((name?: string, scopes?: string[]) => string) | ((name?: string, scopes?: string[]) => Promise<string>);
    /**
     * override base path
     *
     * @type {string}
     * @memberof Configuration
     */
    basePath?: string;
    /**
     * base options for axios calls
     *
     * @type {any}
     * @memberof Configuration
     */
    baseOptions?: any;
    /**
     * parameter for expiry date of the access token
     *
     * @type {Date}
     * @memberof Configuration
     */
    expirationDate: Date;
    /**
     * The retry policy
     */
    retryPolicy: RetryPolicy;
    /**
     * The Blink Debit URL
     *
     * @private
     */
    private readonly _debitUrl: string;
    /**
     * The Axios request timeout
     *
     * @private
     */
    private readonly _timeout: number = 10000;
    /**
     * The retry flag
     *
     * @private
     */
    private readonly _retryEnabled: boolean = true;
    /**
     * The OAuth2 client ID
     *
     * @private
     */
    private readonly _clientId: string;
    /**
     * The OAuth2 client secret
     *
     * @private
     */
    private readonly _clientSecret: string;

    private static instance: Configuration;

    private constructor(axios: AxiosInstance, config: BlinkPayConfig);

    private constructor(axios: AxiosInstance, configDirectory?: string, configFile?: string);

    private constructor(axios: AxiosInstance, configDirectoryOrConfig?: string | BlinkPayConfig,  configFile?: string) {
        let config;
        let timeout;
        let retryEnabled;
        // check if it's not a browser environment
        if (typeof window === 'undefined') {
            const fs = require('fs');

            if (typeof configDirectoryOrConfig === 'string') {
                // load properties from config.json
                // environment variables from .env have higher priority
                const configPath = this.getConfigPath(configDirectoryOrConfig, configFile);
                config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            } else {
                // load properties from config.json
                // environment variables from .env have higher priority
                const configPath = this.getConfigPath(undefined, configFile);
                config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            }

            this._debitUrl = process.env.BLINKPAY_DEBIT_URL
                ? process.env.BLINKPAY_DEBIT_URL
                : (config.blinkpay && config.blinkpay.debitUrl);
            timeout = process.env.BLINKPAY_TIMEOUT
                ? process.env.BLINKPAY_TIMEOUT
                : (config.blinkpay && config.blinkpay.timeout);
            retryEnabled = process.env.BLINKPAY_RETRY_ENABLED
                ? process.env.BLINKPAY_RETRY_ENABLED
                : (config.blinkpay && config.blinkpay.retryEnabled);
            this._clientId = process.env.BLINKPAY_CLIENT_ID
                ? process.env.BLINKPAY_CLIENT_ID
                : (config.blinkpay && config.blinkpay.clientId);
            this._clientSecret = process.env.BLINKPAY_CLIENT_SECRET;
        } else {
            config = configDirectoryOrConfig as BlinkPayConfig;

            this._debitUrl = config.blinkpay.debitUrl;
            timeout = config.blinkpay.timeout;
            retryEnabled = config.blinkpay.retryEnabled;
            this._clientId = config.blinkpay.clientId;
            this._clientSecret = config.blinkpay.clientSecret;
        }

        // configure base path
        this.basePath = this._debitUrl + '/payments/v1';

        // configure timeout, defaults to 10,000 milliseconds
        this._timeout = Number(timeout);
        if (isNaN(timeout)) {
            this._timeout = 10000;
        }

        // configure retry flag
        if (typeof retryEnabled === 'boolean') {
            this._retryEnabled = retryEnabled;
        } else if (typeof retryEnabled === 'string') {
            this._retryEnabled = retryEnabled.toLowerCase() === 'true';
        } else {
            this._retryEnabled = false;
        }

        this.configureAxios(axios);
        this.configureRetry();
    }

    private configureAxios(axios: AxiosInstance) {
        // configure timeout
        axios.defaults.timeout = this._timeout;

        // intercept request
        axios.interceptors.request.use(request => {
            log.debug(`Outbound request: ${request.method.toUpperCase()} ${request.url}`);

            const headers = Configuration.sanitiseHeaders({...request.headers});
            log.debug(`Headers: ${JSON.stringify(headers)}`);

            if (request.params) {
                log.debug(`Parameters: ${qs.stringify(request.params, {arrayFormat: 'brackets'})}`);
            }

            if (request.data) {
                request.data = decamelizeKeys(request.data);
                log.debug(`Data: ${qs.stringify(request.data, {arrayFormat: 'brackets'})}`);
            }

            return request;
        });

        // intercept response
        axios.interceptors.response.use(response => {
            log.debug('Inbound response: ' + response.status + ' ' + response.statusText);

            log.debug(`Headers: ${JSON.stringify(response.headers)}`);

            if (response.data) {
                response.data = camelizeKeys(response.data);
                log.debug(`Data: ${qs.stringify(response.data, {arrayFormat: 'brackets'})}`);
            }

            return response;
        }, error => {
            const status = error.response.status;
            const headers = error.response.headers;
            const body = error.response.data ? error.response.data : error.message;
            switch (status) {
                case 401:
                    log.error(`Status Code: ${status}\nHeaders: ${JSON.stringify(headers)}\nBody: ${body.message}`);
                    throw new BlinkUnauthorisedException(body.message);
                case 403:
                    log.error(`Status Code: ${status}\nHeaders: ${JSON.stringify(headers)}\nBody: ${body.message}`);
                    throw new BlinkForbiddenException(body.message);
                case 404:
                    log.error(`Status Code: ${status}\nHeaders: ${JSON.stringify(headers)}\nBody: ${body.message}`);
                    throw new BlinkResourceNotFoundException(body.message);
                case 408:
                    log.error(`Status Code: ${status}\nHeaders: ${JSON.stringify(headers)}\nBody: ${body.message}`);
                    throw new BlinkRetryableException(body.message);
                case 422:
                    log.error(`Status Code: ${status}\nHeaders: ${JSON.stringify(headers)}\nBody: ${body.message}`);
                    throw new BlinkUnauthorisedException(body.message);
                case 429:
                    log.error(`Status Code: ${status}\nHeaders: ${JSON.stringify(headers)}\nBody: ${body.message}`);
                    throw new BlinkRateLimitExceededException(body.message);
                case 501:
                    log.error(`Status Code: ${status}\nHeaders: ${JSON.stringify(headers)}\nBody: ${body.message}`);
                    throw new BlinkNotImplementedException(body.message);
                case 502:
                    log.error(`Status Code: ${status}\nHeaders: ${JSON.stringify(headers)}\nBody: ${body.message}`);
                    throw new BlinkServiceException(`Service call to Blink Debit failed with error: ${body.message}, please contact BlinkPay with the correlation ID: ${headers['x-correlation-id']}`);
                default:
                    if (status >= 400 && status < 500) {
                        log.error(`Status Code: ${status}\nHeaders: ${JSON.stringify(headers)}\nBody: ${body.message}`);
                        throw new BlinkClientException(body.message);
                    } else if (status >= 500) {
                        log.error(`Status Code: ${status}\nHeaders: ${JSON.stringify(headers)}\nBody: ${body.message}`);
                        throw new BlinkRetryableException(body.message);
                    }
            }
        });
    }

    private configureRetry() {
        if (!this._retryEnabled) {
            return;
        }

        this.retryPolicy = retry(handleType(BlinkRetryableException), {
            maxAttempts: 2,
            backoff: new ExponentialBackoff({maxDelay: Math.random() * 1000, initialDelay: 2000, exponent: 2})
        });
    }

    static getInstance(axios: AxiosInstance, configDirectoryOrConfig?: string | BlinkPayConfig, configFile?: string): Configuration {
        if (!Configuration.instance) {
            if (typeof configDirectoryOrConfig === 'string') {
                Configuration.instance = new Configuration(axios, configDirectoryOrConfig, configFile);
            } else if (configDirectoryOrConfig === undefined) {
                Configuration.instance = new Configuration(axios, undefined, configFile);
            } else {
                Configuration.instance = new Configuration(axios, configDirectoryOrConfig);
            }
        }
        return Configuration.instance;
    }

    async getAccessToken(axios: AxiosInstance): Promise<string | ((name?: string, scopes?: string[]) => string) | ((name?: string, scopes?: string[]) => Promise<string>)> {
        // If token is undefined or expired, refresh it
        if (!this.accessToken || new Date() >= this.expirationDate) {
            await this.refreshToken(axios);
        }

        return this.accessToken;
    }

    private async refreshToken(axios: AxiosInstance): Promise<void> {
        const clientId = this._clientId;
        const clientSecret = this._clientSecret;
        const tokenEndpoint = this._debitUrl + '/oauth2/token';

        const axiosConfig: AxiosRequestConfig = {
            method: 'POST',
            url: tokenEndpoint,
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                'client_id': clientId,
                'client_secret': clientSecret,
                'grant_type': 'client_credentials'
            }
        };

        try {
            const response = await axios.request<AccessTokenResponse>(axiosConfig);
            const accessTokenResponse = response.data;
            this.accessToken = accessTokenResponse.accessToken;
            this.expirationDate = new Date(Date.now() + (response.data.expiresIn * 1000));

            axios.interceptors.request.use(async (config) => {
                const token = await this.getAccessToken(axios);
                config.headers.Authorization = `Bearer ${token}`;
                return config;
            });
        } catch (error) {
            log.error(`Encountered: ${error}`);
        }
    }

    private static sanitiseHeaders(headers: any): Record<string, string> {
        const AUTHORIZATION = 'Authorization';
        const authorization = headers[AUTHORIZATION] || headers['authorization'];
        if (authorization && authorization.trim() !== '') {
            headers[AUTHORIZATION] = '***REDACTED BEARER TOKEN***';
        }

        return headers;
    }

    private getConfigPath(directory: string | undefined, filename: string = 'config.json'): string {
        // check if it's not a browser environment
        if (typeof window === 'undefined') {
            const path = require('path');
            if (directory) {
                return path.resolve(__dirname, directory, filename);
            } else {
                return path.resolve(__dirname, filename);
            }
        }
    }
}
