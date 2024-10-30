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

import {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios';
import {Configuration} from '../../../configuration';
import {BaseAPI, RequestArgs} from '../../../base';
import {Payment, PaymentRequest, PaymentResponse} from '../../dto';
import {decamelizeKeys} from 'humps';
import {BlinkInvalidValueException} from '../../exceptions';
import {TokenAPI} from './token-api';
import {GenericParameters} from "../../util/types";
import {buildRequestHeaders} from "../../util/helper";

/**
 * PaymentsApi - axios parameter creator
 *
 * @export
 */
export const PaymentsApiAxiosParamCreator = function (axios: AxiosInstance, configuration?: Configuration) {
    if (!axios) {
        throw new BlinkInvalidValueException("Axios instance is required");
    }

    return {
        /**
         * Create a payment request with a given customer consent. This creates a single, direct credit payment.  A 200 response does **not** indicate a successful debit. The payment status can be checked by subsequent calls to the returned payment object.
         * @summary Create Payment
         * @param {PaymentRequest} [body] The particulars of the charge.

         The enduring request parameters are included if the payment relates to an enduring consent.
         @param {GenericParameters} params the generic parameters
         */
        createPayment: async (body: PaymentRequest, params: GenericParameters = {}): Promise<RequestArgs> => {
            const {requestId, xCorrelationId, xCustomerIp, xCustomerUserAgent, idempotencyKey, options} = params;
            const localVarPath = `/payments`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, 'https://example.com');
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions: AxiosRequestConfig = {method: 'POST', ...baseOptions, ...options};
            const localVarHeaderParameter = buildRequestHeaders({
                requestId,
                xCorrelationId,
                xCustomerIp,
                xCustomerUserAgent,
                idempotencyKey
            });
            const localVarQueryParameter = {} as any;

            // authentication Bearer required
            // oauth required
            await TokenAPI.getInstance(axios, configuration).getAccessToken();
            if (configuration && configuration.accessToken) {
                const localVarAccessTokenValue = typeof configuration.accessToken === 'function'
                        ? await configuration.accessToken("Bearer", ["create:single_consent", "view:single_consent", "revoke:single_consent", "create:enduring_consent", "view:enduring_consent", "revoke:enduring_consent", "create:payment", "view:payment", "view:metadata", "view:transaction", "create:quick_payment", "view:quick_payment", "create:refund", "view:refund"])
                        : await configuration.accessToken;
                localVarHeaderParameter["Authorization"] = `Bearer ${localVarAccessTokenValue}`;
            }

            localVarHeaderParameter['Content-Type'] = 'application/json';

            const query = new URLSearchParams(localVarUrlObj.search);
            for (const key in localVarQueryParameter) {
                query.set(key, localVarQueryParameter[key]);
            }
            for (const key in options?.params) {
                query.set(key, options.params[key]);
            }
            localVarUrlObj.search = (new URLSearchParams(query)).toString();
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options?.headers};
            const needsSerialization = (typeof body !== "string") || localVarRequestOptions.headers['Content-Type'] === 'application/json';
            localVarRequestOptions.data = needsSerialization ? JSON.stringify(body !== undefined ? decamelizeKeys(body) : {}) : (decamelizeKeys(body) || "");

            return {
                url: localVarUrlObj.pathname + localVarUrlObj.search + localVarUrlObj.hash,
                options: localVarRequestOptions,
            };
        },
        /**
         * Get a payment and its status by ID.
         * @summary Get Payment
         * @param {string} paymentId The payment ID
         * @param {GenericParameters} params the generic parameters
         */
        getPayment: async (paymentId: string, params: GenericParameters = {}): Promise<RequestArgs> => {
            const {requestId, xCorrelationId, xCustomerIp, xCustomerUserAgent, options} = params;
            // verify required parameter 'paymentId' is not null or undefined
            if (paymentId === null || paymentId === undefined) {
                throw new BlinkInvalidValueException('Required parameter paymentId was null or undefined when calling getPayment.');
            }
            const localVarPath = `/payments/{payment_id}`
                    .replace(`{${"payment_id"}}`, encodeURIComponent(String(paymentId)));
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, 'https://example.com');
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions: AxiosRequestConfig = {method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = buildRequestHeaders({
                requestId,
                xCorrelationId,
                xCustomerIp,
                xCustomerUserAgent
            });
            const localVarQueryParameter = {} as any;

            // authentication Bearer required
            // oauth required
            await TokenAPI.getInstance(axios, configuration).getAccessToken();
            if (configuration && configuration.accessToken) {
                const localVarAccessTokenValue = typeof configuration.accessToken === 'function'
                        ? await configuration.accessToken("Bearer", ["create:single_consent", "view:single_consent", "revoke:single_consent", "create:enduring_consent", "view:enduring_consent", "revoke:enduring_consent", "create:payment", "view:payment", "view:metadata", "view:transaction", "create:quick_payment", "view:quick_payment", "create:refund", "view:refund"])
                        : await configuration.accessToken;
                localVarHeaderParameter["Authorization"] = `Bearer ${localVarAccessTokenValue}`;
            }

            const query = new URLSearchParams(localVarUrlObj.search);
            for (const key in localVarQueryParameter) {
                query.set(key, localVarQueryParameter[key]);
            }
            for (const key in options?.params) {
                query.set(key, options.params[key]);
            }
            localVarUrlObj.search = (new URLSearchParams(query)).toString();
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options?.headers};

            return {
                url: localVarUrlObj.pathname + localVarUrlObj.search + localVarUrlObj.hash,
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * PaymentsApi - functional programming interface
 * @export
 */
export const PaymentsApiFp = function (axios: AxiosInstance, configuration?: Configuration) {
    return {
        /**
         * Create a payment request with a given customer consent. This creates a single, direct credit payment.  A 200 response does **not** indicate a successful debit. The payment status can be checked by subsequent calls to the returned payment object.
         * @summary Create Payment
         * @param {PaymentRequest} [body] The particulars of the charge.

         The enduring request parameters are included if the payment relates to an enduring consent.
         @param {GenericParameters} params the generic parameters
         */
        async createPayment(body: PaymentRequest, params: GenericParameters = {}): Promise<(axios?: AxiosInstance, basePath?: string) => Promise<AxiosResponse<PaymentResponse>>> {
            const localVarAxiosArgs = await PaymentsApiAxiosParamCreator(axios, configuration).createPayment(body, params);
            return (axios: AxiosInstance, basePath: string = configuration.basePath) => {
                const axiosRequestArgs: AxiosRequestConfig = {
                    ...localVarAxiosArgs.options,
                    url: basePath + localVarAxiosArgs.url
                };
                if (configuration.retryPolicy) {
                    return configuration.retryPolicy.execute(() => axios.request(axiosRequestArgs))
                }
                return axios.request(axiosRequestArgs);
            };
        },
        /**
         * Get a payment and its status by ID.
         * @summary Get Payment
         * @param {string} paymentId The payment ID
         * @param {GenericParameters} params the generic parameters
         */
        async getPayment(paymentId: string, params: GenericParameters = {}): Promise<(axios?: AxiosInstance, basePath?: string) => Promise<AxiosResponse<Payment>>> {
            const localVarAxiosArgs = await PaymentsApiAxiosParamCreator(axios, configuration).getPayment(paymentId, params);
            return (axios: AxiosInstance, basePath: string = configuration.basePath) => {
                const axiosRequestArgs: AxiosRequestConfig = {
                    ...localVarAxiosArgs.options,
                    url: basePath + localVarAxiosArgs.url
                };
                if (configuration.retryPolicy) {
                    return configuration.retryPolicy.execute(() => axios.request(axiosRequestArgs))
                }
                return axios.request(axiosRequestArgs);
            };
        },
    }
};

/**
 * PaymentsApi - factory interface
 * @export
 */
export const PaymentsApiFactory = function (axios: AxiosInstance, configuration?: Configuration, basePath?: string) {
    return {
        /**
         * Create a payment request with a given customer consent. This creates a single, direct credit payment.  A 200 response does **not** indicate a successful debit. The payment status can be checked by subsequent calls to the returned payment object.
         * @summary Create Payment
         * @param {PaymentRequest} [body] The particulars of the charge.

         The enduring request parameters are included if the payment relates to an enduring consent.
         @param {GenericParameters} params the generic parameters
         */
        async createPayment(body: PaymentRequest, params: GenericParameters = {}): Promise<AxiosResponse<PaymentResponse>> {
            return PaymentsApiFp(axios, configuration).createPayment(body, params).then((request) => request(axios, basePath));
        },
        /**
         * Get a payment and its status by ID.
         * @summary Get Payment
         * @param {string} paymentId The payment ID
         * @param {GenericParameters} params the generic parameters
         */
        async getPayment(paymentId: string, params: GenericParameters = {}): Promise<AxiosResponse<Payment>> {
            return PaymentsApiFp(axios, configuration).getPayment(paymentId, params).then((request) => request(axios, basePath));
        },
    };
};

/**
 * PaymentsApi - object-oriented interface
 * @export
 * @class PaymentsApi
 * @extends {BaseAPI}
 */
export class PaymentsApi extends BaseAPI {
    /**
     * Create a payment request with a given customer consent. This creates a single, direct credit payment.  A 200 response does **not** indicate a successful debit. The payment status can be checked by subsequent calls to the returned payment object.
     * @summary Create Payment
     * @param {PaymentRequest} [body] The particulars of the charge.

     The enduring request parameters are included if the payment relates to an enduring consent.
     @param {GenericParameters} params the generic parameters
     * @memberof PaymentsApi
     */
    public async createPayment(body: PaymentRequest, params: GenericParameters = {}): Promise<AxiosResponse<PaymentResponse>> {
        return PaymentsApiFp(this.axios, this.configuration).createPayment(body, params).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Get a payment and its status by ID.
     * @summary Get Payment
     * @param {string} paymentId The payment ID
     * @param {GenericParameters} params the generic parameters
     * @memberof PaymentsApi
     */
    public async getPayment(paymentId: string, params: GenericParameters = {}): Promise<AxiosResponse<Payment>> {
        return PaymentsApiFp(this.axios, this.configuration).getPayment(paymentId, params).then((request) => request(this.axios, this.basePath));
    }
}
