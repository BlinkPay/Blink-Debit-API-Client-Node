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

import { AxiosInstance, AxiosRequestConfig } from 'axios';
import log from 'loglevel';
import {Configuration} from '../../../configuration';
import {AccessTokenResponse} from '../../dto/v1/access-token-response';

export class TokenAPI {
    private static instance: TokenAPI;
    private readonly _axios: AxiosInstance;
    private readonly _configuration: Configuration;

    private constructor(axios: AxiosInstance, configuration: Configuration) {
        this._axios = axios;
        this._configuration = configuration;
    }

    public static getInstance(axios: AxiosInstance, configuration: Configuration): TokenAPI {
        if (!TokenAPI.instance) {
            TokenAPI.instance = new TokenAPI(axios, configuration);
        }

        return TokenAPI.instance;
    }

    async getAccessToken(): Promise<string | ((name?: string, scopes?: string[]) => string) | ((name?: string, scopes?: string[]) => Promise<string>)> {
        // If token is undefined or expired, refresh it
        if (!this._configuration.accessToken || new Date() >= this._configuration.expirationDate) {
            await this.refreshToken();
        }

        return this._configuration.accessToken;
    }

    private async refreshToken(): Promise<void> {
        const clientId = this._configuration.clientId;
        const clientSecret = this._configuration.clientSecret;
        const tokenEndpoint = this._configuration.debitUrl + '/oauth2/token';

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
            const response = await this._axios.request<AccessTokenResponse>(axiosConfig);
            const accessTokenResponse = response.data;
            this._configuration.accessToken = accessTokenResponse.accessToken;
            this._configuration.expirationDate = new Date(Date.now() + (response.data.expiresIn * 1000));

            this._axios.interceptors.request.use(async (config) => {
                const token = await this.getAccessToken();
                config.headers.Authorization = `Bearer ${token}`;
                return config;
            });
        } catch (error) {
            log.error(`Encountered: ${error}`);
        }
    }
}