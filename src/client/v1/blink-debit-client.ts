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

import {
    BankMetadataApiFactory,
    EnduringConsentsApiFactory,
    PaymentsApiFactory,
    QuickPaymentsApiFactory,
    RefundsApiFactory,
    SingleConsentsApiFactory
} from '../../client';
import {ConstantBackoff, handleType, retry} from 'cockatiel';
import {
    BlinkConsentFailureException,
    BlinkConsentRejectedException,
    BlinkConsentTimeoutException,
    BlinkInvalidValueException,
    BlinkPaymentFailureException,
    BlinkPaymentRejectedException,
    BlinkPaymentTimeoutException,
    BlinkRetryableException,
    BlinkServiceException
} from '../../exceptions';
import globalAxios, {AxiosInstance, AxiosResponse} from 'axios';
import {
    BankMetadata,
    Consent,
    ConsentStatusEnum,
    CreateConsentResponse,
    CreateQuickPaymentResponse,
    EnduringConsentRequest,
    Payment,
    PaymentRequest,
    PaymentResponse,
    PaymentStatusEnum,
    QuickPaymentRequest,
    QuickPaymentResponse,
    Refund,
    RefundDetail,
    RefundResponse,
    SingleConsentRequest
} from '../../dto';
import {Configuration} from '../../../configuration';
import {BlinkPayConfig} from '../../../blinkpay-config';
import log from 'loglevel';

/**
 * The facade for accessing all client methods from one place.
 */
export class BlinkDebitClient {
    private _singleConsentsApi: ReturnType<typeof SingleConsentsApiFactory>;
    private _enduringConsentsApi: ReturnType<typeof EnduringConsentsApiFactory>;
    private _quickPaymentsApi: ReturnType<typeof QuickPaymentsApiFactory>;
    private _paymentsApi: ReturnType<typeof PaymentsApiFactory>;
    private _refundsApi: ReturnType<typeof RefundsApiFactory>;
    private _bankMetadataApi: ReturnType<typeof BankMetadataApiFactory>;

    constructor();

    constructor(axios: AxiosInstance);

    constructor(axios: AxiosInstance, config: BlinkPayConfig);

    constructor(axios: AxiosInstance, configDirectory: string, configFile: string);

    constructor(axios?: AxiosInstance, configDirectoryOrConfigOrDebitUrl?: string | BlinkPayConfig, configFileOrClientId?: string, clientSecret?: string) {
        let configDirectoryOrConfig;
        let configFile;
        if (!axios && !configDirectoryOrConfigOrDebitUrl && !configFileOrClientId && !clientSecret) {
            // Handle no-arg constructor logic here
            axios = globalAxios.create({
                headers: {
                    'Accept': 'application/json'
                }
            });
            configDirectoryOrConfig = {
                blinkpay: {
                    debitUrl: process.env.REACT_APP_BLINKPAY_DEBIT_URL || '',
                    clientId: process.env.REACT_APP_BLINKPAY_CLIENT_ID || '',
                    clientSecret: process.env.REACT_APP_BLINKPAY_CLIENT_SECRET || '',
                    timeout: 10000,
                    retryEnabled: true
                }
            };
        } else
        if (axios && !configDirectoryOrConfigOrDebitUrl && !configFileOrClientId && !clientSecret) {
            // Handle axios constructor logic here
            configDirectoryOrConfig = {
                blinkpay: {
                    debitUrl: process.env.REACT_APP_BLINKPAY_DEBIT_URL || '',
                    clientId: process.env.REACT_APP_BLINKPAY_CLIENT_ID || '',
                    clientSecret: process.env.REACT_APP_BLINKPAY_CLIENT_SECRET || '',
                    timeout: 10000,
                    retryEnabled: true
                }
            };
        } else if (axios && typeof configDirectoryOrConfigOrDebitUrl === 'object') {
            // Handle axios, config constructor logic here
            configDirectoryOrConfig = configDirectoryOrConfigOrDebitUrl;
        } else if (axios && typeof configDirectoryOrConfigOrDebitUrl === 'string' && typeof configFileOrClientId === 'string') {
            // Handle axios, configDirectory, configFile constructor logic here
            configDirectoryOrConfig = configDirectoryOrConfigOrDebitUrl;
            configFile = configFileOrClientId;
        } else if (axios && typeof configDirectoryOrConfigOrDebitUrl === 'string' && typeof configFileOrClientId === 'string' && clientSecret) {
            // Handle axios, debitUrl, clientId, clientSecret constructor logic here
            // In this case, configDirectoryOrConfig is debitUrl, and configFileOrClientId is clientId
            configDirectoryOrConfig = {
                blinkpay: {
                    debitUrl: configDirectoryOrConfigOrDebitUrl,
                    clientId: process.env.REACT_APP_BLINKPAY_CLIENT_ID || '',
                    clientSecret: process.env.REACT_APP_BLINKPAY_CLIENT_SECRET || '',
                    timeout: 10000,
                    retryEnabled: true
                }
            };
        }

        if (!axios) {
            throw new BlinkInvalidValueException("Axios instance is required");
        }

        const configuration = Configuration.getInstance(axios, configDirectoryOrConfig, configFile);

        this._singleConsentsApi = SingleConsentsApiFactory(axios, configuration, undefined);
        this._enduringConsentsApi = EnduringConsentsApiFactory(axios, configuration, undefined);
        this._quickPaymentsApi = QuickPaymentsApiFactory(axios, configuration, undefined);
        this._paymentsApi = PaymentsApiFactory(axios, configuration, undefined);
        this._refundsApi = RefundsApiFactory(axios, configuration, undefined);
        this._bankMetadataApi = BankMetadataApiFactory(axios, configuration, undefined);
    }

    /**
     * Returns the bank metadata list.
     *
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit.
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit.
     * @returns {Promise<BankMetadata[]>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public getMeta(requestId?: string, xCorrelationId?: string): Promise<BankMetadata[]> {
        return this.getMetaAsync(requestId, xCorrelationId)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Returns the bank metadata list.
     *
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit.
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit.
     * @returns {Promise<AxiosResponse<BankMetadata[]>>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async getMetaAsync(requestId?: string, xCorrelationId?: string): Promise<AxiosResponse<BankMetadata[]>> {
        return this._bankMetadataApi.getMeta(requestId, xCorrelationId);
    }

    /**
     * Creates a single consent
     *
     * @param singleConsentRequest The consent request parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @param xCustomerIp The customers IP address (optional)
     * @param idempotencyKey An optional idempotency key to prevent duplicate submissions. (optional)
     * @returns {Promise<CreateConsentResponse>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public createSingleConsent(singleConsentRequest: SingleConsentRequest | null, requestId?: string, xCorrelationId?: string, xCustomerIp?: string, idempotencyKey?: string): Promise<CreateConsentResponse> {
        return this.createSingleConsentAsync(singleConsentRequest, requestId, xCorrelationId, xCustomerIp, idempotencyKey)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Creates a single consent
     *
     * @param singleConsentRequest The consent request parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @param xCustomerIp The customers IP address (optional)
     * @param idempotencyKey An optional idempotency key to prevent duplicate submissions. (optional)
     * @returns {Promise<AxiosResponse<CreateConsentResponse>>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async createSingleConsentAsync(singleConsentRequest: SingleConsentRequest | null, requestId?: string, xCorrelationId?: string, xCustomerIp?: string, idempotencyKey?: string): Promise<AxiosResponse<CreateConsentResponse>> {
        return this._singleConsentsApi.createSingleConsent(singleConsentRequest, requestId, xCorrelationId, xCustomerIp, idempotencyKey);
    }

    /**
     * Retrieves an existing consent by ID
     *
     * @param consentId The consent ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<Consent>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public getSingleConsent(consentId: string, requestId?: string, xCorrelationId?: string): Promise<Consent> {
        return this.getSingleConsentAsync(consentId, requestId, xCorrelationId)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Retrieves an existing consent by ID
     *
     * @param consentId The consent ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<AxiosResponse<Consent>>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async getSingleConsentAsync(consentId: string, requestId?: string, xCorrelationId?: string): Promise<AxiosResponse<Consent>> {
        return this._singleConsentsApi.getSingleConsent(consentId, requestId, xCorrelationId);
    }

    /**
     * Retrieves an authorised single consent by ID within the specified time
     *
     * @param consentId The consent ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<Consent>}
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs.
     * @throws {BlinkServiceException} Thrown when an exception occurs.
     */
    public awaitAuthorisedSingleConsent(consentId: string, maxWaitSeconds: number): Promise<Consent> {
        const retryPolicy = retry(handleType(BlinkRetryableException), {
            maxAttempts: maxWaitSeconds,
            backoff: new ConstantBackoff(1000)
        });

        return retryPolicy
            .execute(async () => {
                const consent = await this.getSingleConsentAsync(consentId);

                const status = consent.data.status;
                log.debug(`The last status polled was: ${status} \tfor Single Consent ID: ${consentId}`);

                if (status === ConsentStatusEnum.Authorised) {
                    return consent;
                }

                throw new BlinkRetryableException();
            })
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkRetryableException) {
                    throw new BlinkConsentTimeoutException();
                } else if (error instanceof BlinkConsentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error.innerException instanceof BlinkConsentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException('Unexpected error: ' + error.message, error);
                }
            });
    }

    /**
     * Retrieves an authorised single consent by ID within the specified time
     *
     * @param consentId The consent ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<Consent>}
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public awaitAuthorisedSingleConsentOrThrowException(consentId: string, maxWaitSeconds: number): Promise<Consent> {
        return this.awaitAuthorisedSingleConsentAsync(consentId, maxWaitSeconds)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkConsentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error.innerException instanceof BlinkConsentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException(error.message, error);
                }
            });
    }

    /**
     * Retrieves an authorised single consent by ID within the specified time. The consent statuses are handled accordingly.
     *
     * @param consentId The consent ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<AxiosResponse<Consent>>}
     * @throws {BlinkConsentRejectedException} Thrown when a consent has been rejected by the customer
     * @throws {BlinkConsentTimeoutException} Thrown when a consent was not completed within the bank's request timeout window
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs
     */
    public async awaitAuthorisedSingleConsentAsync(consentId: string, maxWaitSeconds: number): Promise<AxiosResponse<Consent>> {
        const retryPolicy = retry(handleType(BlinkRetryableException), {
            maxAttempts: maxWaitSeconds,
            backoff: new ConstantBackoff(1000)
        });

        return await retryPolicy
            .execute(async () => {
                const consent = await this.getSingleConsentAsync(consentId);

                const status = consent.data.status;
                log.debug(`The last status polled was: ${status} \tfor Single Consent ID: ${consentId}`);

                switch (status) {
                    case ConsentStatusEnum.Authorised:
                    case ConsentStatusEnum.Consumed:
                        log.debug(`Single consent completed for ID: ${consentId}`);
                        return consent;
                    case ConsentStatusEnum.Rejected:
                    case ConsentStatusEnum.Revoked:
                        throw new BlinkConsentRejectedException(`Single consent [${consentId}] has been rejected or revoked`);
                    case ConsentStatusEnum.GatewayTimeout:
                        throw new BlinkConsentTimeoutException(`Gateway timed out for single consent [${consentId}]`);
                    case ConsentStatusEnum.GatewayAwaitingSubmission:
                    case ConsentStatusEnum.AwaitingAuthorisation:
                    default:
                        throw new BlinkRetryableException(`Single consent [${consentId}] is waiting for authorisation`);
                }
            })
            .catch(error => {
                if (error instanceof BlinkRetryableException) {
                    throw new BlinkConsentTimeoutException();
                } else if (error instanceof BlinkConsentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error.innerException instanceof BlinkConsentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException('Unexpected error: ' + error.message, error);
                }
            });
    }

    /**
     * Revokes an existing consent by ID
     *
     * @param consentId The consent ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<void>}
     * @throws {BlinkServiceException} Thrown when a Blink Debit exception occurs
     */
    public revokeSingleConsent(consentId: string, requestId?: string, xCorrelationId?: string): Promise<void> {
        return this.revokeSingleConsentAsync(consentId, requestId, xCorrelationId).then(response => response.data);
    }

    /**
     * Revokes an existing consent by ID
     *
     * @param consentId The consent ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<AxiosResponse<void>>}
     * @throws {BlinkServiceException} Thrown when a Blink Debit exception occurs
     */
    public async revokeSingleConsentAsync(consentId: string, requestId?: string, xCorrelationId?: string): Promise<AxiosResponse<void>> {
        return this._singleConsentsApi.revokeSingleConsent(consentId, requestId, xCorrelationId);
    }

    /**
     * Creates an enduring consent
     *
     * @param enduringConsentRequest The consent request parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @param xCustomerIp The customers IP address (optional)
     * @param idempotencyKey An optional idempotency key to prevent duplicate submissions. (optional)
     * @returns {Promise<CreateConsentResponse>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public createEnduringConsent(enduringConsentRequest: EnduringConsentRequest, requestId?: string, xCorrelationId?: string, xCustomerIp?: string, idempotencyKey?: string): Promise<CreateConsentResponse> {
        return this._enduringConsentsApi.createEnduringConsent(enduringConsentRequest, requestId, xCorrelationId, xCustomerIp, idempotencyKey)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }
                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Creates an enduring consent
     *
     * @param enduringConsentRequest The consent request parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @param xCustomerIp The customers IP address (optional)
     * @param idempotencyKey An optional idempotency key to prevent duplicate submissions. (optional)
     * @returns {Promise<AxiosResponse<CreateConsentResponse>>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async createEnduringConsentAsync(enduringConsentRequest: EnduringConsentRequest, requestId?: string, xCorrelationId?: string, xCustomerIp?: string, idempotencyKey?: string): Promise<AxiosResponse<CreateConsentResponse>> {
        return await this._enduringConsentsApi.createEnduringConsent(enduringConsentRequest, requestId, xCorrelationId, xCustomerIp, idempotencyKey);
    }

    /**
     * Retrieves an existing consent by ID
     *
     * @param consentId The consent ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns Promise<Consent>
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public getEnduringConsent(consentId: string, requestId?: string, xCorrelationId?: string): Promise<Consent> {
        return this.getEnduringConsentAsync(consentId, requestId, xCorrelationId)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Retrieves an existing consent by ID
     *
     * @param consentId The consent ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns Promise<AxiosResponse<Consent>>
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async getEnduringConsentAsync(consentId: string, requestId?: string, xCorrelationId?: string): Promise<AxiosResponse<Consent>> {
        return await this._enduringConsentsApi.getEnduringConsent(consentId, requestId, xCorrelationId);
    }

    /**
     * Retrieves an authorised enduring consent by ID within the specified time
     *
     * @param consentId The consent ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<Consent>}
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs.
     * @throws {BlinkServiceException} Thrown when an exception occurs.
     */
    public awaitAuthorisedEnduringConsent(consentId: string, maxWaitSeconds: number): Promise<Consent> {
        const retryPolicy = retry(handleType(BlinkRetryableException), {
            maxAttempts: maxWaitSeconds,
            backoff: new ConstantBackoff(1000)
        });

        return retryPolicy
            .execute(async () => {
                const consent = await this.getEnduringConsentAsync(consentId);

                const status = consent.data.status;
                log.debug(`The last status polled was: ${status} \tfor Enduring Consent ID: ${consentId}`);

                if (status === ConsentStatusEnum.Authorised) {
                    return consent;
                }

                throw new BlinkRetryableException();
            })
            .then(response => response.data)
            .catch(async error => {
                if (error instanceof BlinkRetryableException) {
                    const blinkConsentTimeoutException = new BlinkConsentTimeoutException();

                    try {
                        await this.revokeEnduringConsentAsync(consentId);
                        log.info(
                            "The max wait time was reached while waiting for the enduring consent to complete and the payment has been revoked with the server. Enduring consent ID: ",
                            consentId);
                    } catch (revokeException) {
                        if (revokeException != undefined) {
                            log.error(
                                "Waiting for the enduring consent was not successful and it was also not able to be revoked with the server due to: ",
                                revokeException.message);
                            throw new AggregateError([blinkConsentTimeoutException, revokeException]);
                        }
                    }

                    throw blinkConsentTimeoutException;
                } else if (error instanceof BlinkConsentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error.innerException instanceof BlinkConsentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException('Unexpected error: ' + error.message, error);
                }
            });
    }

    /**
     * Retrieves an authorised enduring consent by ID within the specified time
     *
     * @param consentId The consent ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<Consent>}
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public awaitAuthorisedEnduringConsentOrThrowException(consentId: string, maxWaitSeconds: number): Promise<Consent> {
        return this.awaitAuthorisedEnduringConsentAsync(consentId, maxWaitSeconds)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkConsentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error.innerException instanceof BlinkConsentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException(error.message, error);
                }
            });
    }

    /**
     * Retrieves an authorised enduring consent by ID within the specified time. The consent statuses are handled accordingly.
     *
     * @param consentId The consent ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<AxiosResponse<Consent>>}
     * @throws {BlinkConsentRejectedException} Thrown when a consent has been rejected by the customer
     * @throws {BlinkConsentTimeoutException} Thrown when a consent was not completed within the bank's request timeout window
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs
     */
    public async awaitAuthorisedEnduringConsentAsync(consentId: string, maxWaitSeconds: number): Promise<AxiosResponse<Consent>> {
        const retryPolicy = retry(handleType(BlinkRetryableException), {
            maxAttempts: maxWaitSeconds,
            backoff: new ConstantBackoff(1000)
        });

        return await retryPolicy
            .execute(async () => {
                const consent = await this.getEnduringConsentAsync(consentId);

                const status = consent.data.status;
                log.debug(`The last status polled was: ${status} \tfor Enduring Consent ID: ${consentId}`);

                switch (status) {
                    case ConsentStatusEnum.Authorised:
                    case ConsentStatusEnum.Consumed:
                        log.debug(`Enduring consent completed for ID: ${consentId}`);
                        return consent;
                    case ConsentStatusEnum.Rejected:
                    case ConsentStatusEnum.Revoked:
                        throw new BlinkConsentRejectedException(`Enduring consent [${consentId}] has been rejected or revoked`);
                    case ConsentStatusEnum.GatewayTimeout:
                        throw new BlinkConsentTimeoutException(`Gateway timed out for enduring consent [${consentId}]`);
                    case ConsentStatusEnum.GatewayAwaitingSubmission:
                    case ConsentStatusEnum.AwaitingAuthorisation:
                    default:
                        throw new BlinkRetryableException(`Enduring consent [${consentId}] is waiting for authorisation`);
                }
            })
            .catch(async error => {
                if (error instanceof BlinkRetryableException) {
                    const blinkConsentTimeoutException = new BlinkConsentTimeoutException();

                    try {
                        await this.revokeEnduringConsentAsync(consentId);
                        log.info(
                            "The max wait time was reached while waiting for the enduring consent to complete and the payment has been revoked with the server. Enduring consent ID: ",
                            consentId);
                    } catch (revokeException) {
                        if (revokeException != undefined) {
                            log.error(
                                "Waiting for the enduring consent was not successful and it was also not able to be revoked with the server due to: ",
                                revokeException.message);
                            throw new AggregateError([blinkConsentTimeoutException, revokeException]);
                        }
                    }

                    throw blinkConsentTimeoutException;
                } else if (error instanceof BlinkConsentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error.innerException instanceof BlinkConsentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException(error.message, error);
                }
            });
    }

    /**
     * Revokes an existing consent by ID
     *
     * @param consentId The consent ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<void>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public revokeEnduringConsent(consentId: string, requestId?: string, xCorrelationId?: string): Promise<void> {
        return this.revokeEnduringConsentAsync(consentId, requestId, xCorrelationId)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Revokes an existing consent by ID
     *
     * @param consentId The consent ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<AxiosResponse<void>>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async revokeEnduringConsentAsync(consentId: string, requestId?: string, xCorrelationId?: string): Promise<AxiosResponse<void>> {
        return await this._enduringConsentsApi.revokeEnduringConsent(consentId, requestId, xCorrelationId);
    }

    /**
     * Creates a quick payment
     *
     * @param quickPaymentRequest The quick payment request parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @param xCustomerIp The customers IP address (optional)
     * @param idempotencyKey An optional idempotency key to prevent duplicate submissions. (optional)
     * @returns {Promise<CreateQuickPaymentResponse>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public createQuickPayment(quickPaymentRequest: QuickPaymentRequest, requestId?: string, xCorrelationId?: string, xCustomerIp?: string, idempotencyKey?: string): Promise<CreateQuickPaymentResponse> {
        return this.createQuickPaymentAsync(quickPaymentRequest, requestId, xCorrelationId, xCustomerIp, idempotencyKey)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Creates a quick payment
     *
     * @param quickPaymentRequest The quick payment request parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @param xCustomerIp The customers IP address (optional)
     * @param idempotencyKey An optional idempotency key to prevent duplicate submissions. (optional)
     * @returns {Promise<AxiosResponse<CreateQuickPaymentResponse>>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async createQuickPaymentAsync(quickPaymentRequest: QuickPaymentRequest, requestId?: string, xCorrelationId?: string, xCustomerIp?: string, idempotencyKey?: string): Promise<AxiosResponse<CreateQuickPaymentResponse>> {
        return await this._quickPaymentsApi.createQuickPayment(quickPaymentRequest, requestId, xCorrelationId, xCustomerIp, idempotencyKey);
    }

    /**
     * Retrieves an existing quick payment by ID
     *
     * @param quickPaymentId The quick payment ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<QuickPaymentResponse>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public getQuickPayment(quickPaymentId: string, requestId?: string, xCorrelationId?: string): Promise<QuickPaymentResponse> {
        return this.getQuickPaymentAsync(quickPaymentId, requestId, xCorrelationId)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Retrieves an existing quick payment by ID
     *
     * @param quickPaymentId The quick payment ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<QuickPaymentResponse>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async getQuickPaymentAsync(quickPaymentId: string, requestId?: string, xCorrelationId?: string): Promise<AxiosResponse<QuickPaymentResponse>> {
        return await this._quickPaymentsApi.getQuickPayment(quickPaymentId, requestId, xCorrelationId);
    }

    /**
     * Retrieves a successful quick payment by ID within the specified time
     *
     * @param quickPaymentId The quick payment ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<QuickPaymentResponse>}
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public awaitSuccessfulQuickPayment(quickPaymentId: string, maxWaitSeconds: number): Promise<QuickPaymentResponse> {
        const retryPolicy = retry(handleType(BlinkRetryableException), {
            maxAttempts: maxWaitSeconds,
            backoff: new ConstantBackoff(1000)
        });

        return retryPolicy
            .execute(async () => {
                const quickPayment = await this.getQuickPaymentAsync(quickPaymentId);

                const status = quickPayment.data.consent.status;
                log.debug(`The last status polled was: ${status} \tfor Quick Payment ID: ${quickPaymentId}`);

                if (status === ConsentStatusEnum.Authorised) {
                    return quickPayment;
                }

                throw new BlinkRetryableException();
            })
            .then(response => response.data)
            .catch(async error => {
                if (error instanceof BlinkRetryableException) {
                    const blinkConsentTimeoutException = new BlinkConsentTimeoutException();

                    try {
                        await this.revokeQuickPaymentAsync(quickPaymentId);
                        log.info(
                            "The max wait time was reached while waiting for the quick payment to complete and the payment has been revoked with the server. Quick payment ID: ",
                            quickPaymentId);
                    } catch (revokeException) {
                        if (revokeException != undefined) {
                            log.error(
                                "Waiting for the quick payment was not successful and it was also not able to be revoked with the server due to: ",
                                revokeException.message);
                            throw new AggregateError([blinkConsentTimeoutException, revokeException]);
                        }
                    }

                    throw blinkConsentTimeoutException;
                } else if (error instanceof BlinkConsentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error instanceof BlinkConsentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException(error.message, error);
                }
            });
    }

    /**
     * Retrieves a successful quick payment by ID within the specified time
     *
     * @param quickPaymentId The quick payment ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<QuickPaymentResponse>}
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public awaitSuccessfulQuickPaymentOrThrowException(quickPaymentId: string, maxWaitSeconds: number): Promise<QuickPaymentResponse> {
        return this.awaitSuccessfulQuickPaymentAsync(quickPaymentId, maxWaitSeconds)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkConsentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error.innerException instanceof BlinkConsentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException(error.message, error);
                }
            });
    }

    /**
     * Retrieves a successful quick payment by ID within the specified time. The consent statuses are handled accordingly.
     *
     * @param quickPaymentId The quick payment ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<AxiosResponse<QuickPaymentResponse>>}
     * @throws {BlinkConsentRejectedException} Thrown when a consent has been rejected by the customer
     * @throws {BlinkConsentTimeoutException} Thrown when a consent was not completed within the bank's request timeout window
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs
     */
    public async awaitSuccessfulQuickPaymentAsync(quickPaymentId: string, maxWaitSeconds: number): Promise<AxiosResponse<QuickPaymentResponse>> {
        const retryPolicy = retry(handleType(BlinkRetryableException), {
            maxAttempts: maxWaitSeconds,
            backoff: new ConstantBackoff(1000)
        });

        return await retryPolicy
            .execute(async () => {
                const quickPayment = await this.getQuickPaymentAsync(quickPaymentId);

                const status = quickPayment.data.consent.status;
                log.debug(`The last status polled was: ${status} \tfor Quick Payment ID: ${quickPaymentId}`);

                switch (status) {
                    case ConsentStatusEnum.Authorised:
                    case ConsentStatusEnum.Consumed:
                        log.debug(`Quick payment completed for ID: ${quickPaymentId}`);
                        return quickPayment;
                    case ConsentStatusEnum.Rejected:
                    case ConsentStatusEnum.Revoked:
                        throw new BlinkConsentRejectedException(`Quick payment [${quickPaymentId}] has been rejected or revoked`);
                    case ConsentStatusEnum.GatewayTimeout:
                        throw new BlinkConsentTimeoutException(`Gateway timed out for quick payment [${quickPaymentId}]`);
                    case ConsentStatusEnum.GatewayAwaitingSubmission:
                    case ConsentStatusEnum.AwaitingAuthorisation:
                    default:
                        throw new BlinkRetryableException(`Quick payment [${quickPaymentId}] is waiting for authorisation`);
                }
            })
            .catch(async error => {
                if (error instanceof BlinkRetryableException) {
                    const blinkConsentTimeoutException = new BlinkConsentTimeoutException();

                    try {
                        await this.revokeQuickPaymentAsync(quickPaymentId);
                        log.info(
                            "The max wait time was reached while waiting for the quick payment to complete and the payment has been revoked with the server. Quick payment ID: ",
                            quickPaymentId);
                    } catch (revokeException) {
                        if (revokeException != undefined) {
                            log.error(
                                "Waiting for the quick payment was not successful and it was also not able to be revoked with the server due to: ",
                                revokeException.message);
                            throw new AggregateError([blinkConsentTimeoutException, revokeException]);
                        }
                    }

                    throw blinkConsentTimeoutException;
                } else if (error instanceof BlinkConsentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error instanceof BlinkConsentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException(error.message, error);
                }
            });
    }

    /**
     * Revokes an existing quick payment by ID
     *
     * @param quickPaymentId The quick payment ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<void>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public revokeQuickPayment(quickPaymentId: string, requestId?: string, xCorrelationId?: string): Promise<void> {
        return this.revokeQuickPaymentAsync(quickPaymentId, requestId, xCorrelationId)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Revokes an existing quick payment by ID
     *
     * @param quickPaymentId The quick payment ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<AxiosResponse<void>>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async revokeQuickPaymentAsync(quickPaymentId: string, requestId?: string, xCorrelationId?: string): Promise<AxiosResponse<void>> {
        return await this._quickPaymentsApi.revokeQuickPayment(quickPaymentId, requestId, xCorrelationId);
    }

    /**
     * Creates a payment
     *
     * @param paymentRequest The payment request parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @param idempotencyKey An optional idempotency key to prevent duplicate submissions. (optional)
     * @returns {Promise<PaymentResponse>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public createPayment(paymentRequest: PaymentRequest, requestId?: string, xCorrelationId?: string, idempotencyKey?: string): Promise<PaymentResponse> {
        return this.createPaymentAsync(paymentRequest, requestId, xCorrelationId, idempotencyKey)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Creates a payment
     *
     * @param paymentRequest The payment request parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @param idempotencyKey An optional idempotency key to prevent duplicate submissions. (optional)
     * @returns {Promise<AxiosResponse<PaymentResponse>>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async createPaymentAsync(paymentRequest: PaymentRequest, requestId?: string, xCorrelationId?: string, idempotencyKey?: string): Promise<AxiosResponse<PaymentResponse>> {
        return await this._paymentsApi.createPayment(paymentRequest, requestId, xCorrelationId, idempotencyKey);
    }

    /**
     * Creates a Westpac payment. Once Westpac enables their Open Banking API, this can be replaced with createPayment.
     *
     * @param paymentRequest The payment request parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @param idempotencyKey An optional idempotency key to prevent duplicate submissions. (optional)
     * @returns {Promise<PaymentResponse>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public createWestpacPayment(paymentRequest: PaymentRequest, requestId?: string, xCorrelationId?: string, idempotencyKey?: string): Promise<PaymentResponse> {
        return this.createWestpacPaymentAsync(paymentRequest, requestId, xCorrelationId, idempotencyKey)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Creates a Westpac payment. Once Westpac enables their Open Banking API, this can be replaced with createPayment.
     *
     * @param paymentRequest The payment request parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @param idempotencyKey An optional idempotency key to prevent duplicate submissions. (optional)
     * @returns {Promise<PaymentResponse>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async createWestpacPaymentAsync(paymentRequest: PaymentRequest, requestId?: string, xCorrelationId?: string, idempotencyKey?: string): Promise<AxiosResponse<PaymentResponse>> {
        return await this._paymentsApi.createPayment(paymentRequest, requestId, xCorrelationId, idempotencyKey);
    }

    /**
     * Retrieves an existing payment by ID
     *
     * @param paymentId The payment ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<Payment>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public getPayment(paymentId: string, requestId?: string, xCorrelationId?: string): Promise<Payment> {
        return this.getPaymentAsync(paymentId, requestId, xCorrelationId)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Retrieves an existing payment by ID
     *
     * @param paymentId The payment ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<Payment>}
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public async getPaymentAsync(paymentId: string, requestId?: string, xCorrelationId?: string): Promise<AxiosResponse<Payment>> {
        return await this._paymentsApi.getPayment(paymentId, requestId, xCorrelationId);
    }

    /**
     * Retrieves a successful payment by ID within the specified time.
     *
     * @param paymentId The payment ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<Payment>}
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public awaitSuccessfulPayment(paymentId: string, maxWaitSeconds: number): Promise<Payment> {
        const retryPolicy = retry(handleType(BlinkRetryableException), {
            maxAttempts: maxWaitSeconds,
            backoff: new ConstantBackoff(1000)
        });

        return retryPolicy
            .execute(async () => {
                const payment = await this.getPaymentAsync(paymentId);

                const status = payment.data.status;
                log.debug(`The last status polled was: ${status} \tfor Payment ID: ${paymentId}`);

                if (status === PaymentStatusEnum.AcceptedSettlementCompleted) {
                    return payment;
                }

                throw new BlinkRetryableException();
            })
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkRetryableException) {
                    throw new BlinkPaymentTimeoutException();
                } else if (error instanceof BlinkPaymentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error.innerException instanceof BlinkPaymentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException('Unexpected error: ' + error.message, error);
                }
            });
    }

    /**
     * Retrieves a successful payment by ID within the specified time.
     *
     * @param paymentId The payment ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<Payment>}
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs
     * @throws {BlinkServiceException} Thrown when an exception occurs
     */
    public awaitSuccessfulPaymentOrThrowException(paymentId: string, maxWaitSeconds: number): Promise<Payment> {
        return this.awaitSuccessfulPaymentAsync(paymentId, maxWaitSeconds)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkPaymentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error.innerException instanceof BlinkPaymentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException(error.message, error);
                }
            });
    }

    /**
     * Retrieves a successful payment by ID within the specified time. The payment statuses are handled accordingly.
     *
     * @param paymentId The payment ID
     * @param maxWaitSeconds The number of seconds to wait
     * @returns {Promise<Payment>}
     * @throws {BlinkConsentRejectedException} Thrown when a consent has been rejected by the customer
     * @throws {BlinkConsentTimeoutException} Thrown when a consent was not completed within the bank's request timeout window
     * @throws {BlinkConsentFailureException} Thrown when a consent exception occurs
     */
    public async awaitSuccessfulPaymentAsync(paymentId: string, maxWaitSeconds: number): Promise<AxiosResponse<Payment>> {
        const retryPolicy = retry(handleType(BlinkRetryableException), {
            maxAttempts: maxWaitSeconds,
            backoff: new ConstantBackoff(1000)
        });

        return await retryPolicy
            .execute(async () => {
                const payment = await this.getPaymentAsync(paymentId);

                const status = payment.data.status;
                log.debug(`The last status polled was: ${status} \tfor Payment ID: ${paymentId}`);

                switch (status) {
                    case PaymentStatusEnum.AcceptedSettlementCompleted:
                        log.debug(`Payment completed for ID: ${paymentId}`);
                        return payment;
                    case PaymentStatusEnum.Rejected:
                        throw new BlinkPaymentRejectedException(`Payment [${paymentId}] has been rejected`);
                    case PaymentStatusEnum.AcceptedSettlementInProcess:
                    case PaymentStatusEnum.Pending:
                    default:
                        throw new BlinkRetryableException(`Payment [${paymentId}] is pending or being processed`);
                }
            })
            .catch(error => {
                if (error instanceof BlinkRetryableException) {
                    throw new BlinkPaymentTimeoutException();
                } else if (error instanceof BlinkPaymentFailureException || error instanceof BlinkServiceException) {
                    throw error;
                } else if (error && error.innerException) {
                    if (error.innerException instanceof BlinkPaymentFailureException || error.innerException instanceof BlinkServiceException) {
                        throw error.innerException;
                    }

                    throw new BlinkServiceException(error.innerException.message);
                } else {
                    throw new BlinkServiceException('Unexpected error: ' + error.message, error);
                }
            });
    }

    /**
     * Creates a refund
     *
     * @param refundDetail The refund detail parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<RefundResponse>}
     * @throws {BlinkServiceException} Thrown when a Blink Debit exception occurs
     */
    public createRefund(refundDetail: RefundDetail, requestId?: string, xCorrelationId?: string): Promise<RefundResponse> {
        return this.createRefundAsync(refundDetail, requestId, xCorrelationId)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Creates a refund
     *
     * @param refundDetail The refund detail parameters
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<AxiosResponse<RefundResponse>>}
     * @throws {BlinkServiceException} Thrown when a Blink Debit exception occurs
     */
    public async createRefundAsync(refundDetail: RefundDetail, requestId?: string, xCorrelationId?: string): Promise<AxiosResponse<RefundResponse>> {
        return await this._refundsApi.createRefund(refundDetail, requestId, xCorrelationId);
    }

    /**
     * Retrieves an existing refund by ID
     *
     * @param refundId The refund ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<Refund>}
     * @throws {BlinkServiceException} Thrown when a Blink Debit exception occurs
     */
    public getRefund(refundId: string, requestId?: string, xCorrelationId?: string): Promise<Refund> {
        return this.getRefundAsync(refundId, requestId, xCorrelationId)
            .then(response => response.data)
            .catch(error => {
                if (error instanceof BlinkServiceException) {
                    throw error;
                }

                throw new BlinkServiceException(error.message, error);
            });
    }

    /**
     * Retrieves an existing refund by ID
     *
     * @param refundId The refund ID
     * @param requestId An optional request ID. If provided, it overrides the interaction ID generated by Blink Debit. (optional)
     * @param xCorrelationId An optional correlation ID for logging chain of events. If provided, it overrides the correlation ID generated by Blink Debit. (optional)
     * @returns {Promise<AxiosResponse<Refund>>}
     * @throws {BlinkServiceException} Thrown when a Blink Debit exception occurs
     */
    public async getRefundAsync(refundId: string, requestId?: string, xCorrelationId?: string): Promise<AxiosResponse<Refund>> {
        return await this._refundsApi.getRefund(refundId, requestId, xCorrelationId);
    }
}
