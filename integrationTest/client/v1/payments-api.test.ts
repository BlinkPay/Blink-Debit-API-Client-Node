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
    Amount,
    AmountCurrencyEnum,
    AuthFlow,
    AuthFlowDetailTypeEnum,
    Bank,
    ConsentDetailTypeEnum,
    DecoupledFlow,
    EnduringConsentRequest,
    EnduringConsentsApiFactory,
    IdentifierType,
    PaymentAcceptedReasonEnum,
    PaymentRequest,
    PaymentsApiFactory,
    PaymentStatusEnum,
    PaymentTypeEnum,
    Pcr,
    Period,
    SingleConsentRequest,
    SingleConsentsApiFactory
} from '../../../src';
import {Configuration} from '../../../configuration';
import globalAxios from 'axios';
import {v4 as uuidv4} from 'uuid';
import {DateTime} from 'luxon';
import {GenericParameters} from "../../../src/util/types";

require('dotenv').config();
jest.setTimeout(120000);

describe('PaymentsApi Integration Test', () => {
    const callbackUrl = 'https://www.mymerchant.co.nz/callback';
    const params: GenericParameters = {
        xCustomerIp: "192.168.0.1",
        xCustomerUserAgent: "demo-api-client"
    };
    let singleConsentsApiInstance: ReturnType<typeof SingleConsentsApiFactory>;
    let enduringConsentsApiInstance: ReturnType<typeof EnduringConsentsApiFactory>;
    let apiInstance: ReturnType<typeof PaymentsApiFactory>;

    beforeAll(async (): Promise<void> => {
        const configuration: Configuration = Configuration.getInstance(globalAxios);

        singleConsentsApiInstance = SingleConsentsApiFactory(globalAxios, configuration, undefined);
        enduringConsentsApiInstance = EnduringConsentsApiFactory(globalAxios, configuration, undefined);
        apiInstance = PaymentsApiFactory(globalAxios, configuration, undefined);
    });

    beforeEach((): void => {
        params.requestId = uuidv4();
        params.xCorrelationId = uuidv4();
        params.idempotencyKey = uuidv4();
    });

    it('Verify that payment for single consent with decoupled flow is created and retrieved', async () => {
        // create single consent with decoupled flow
        const request: SingleConsentRequest = {
            type: ConsentDetailTypeEnum.Single,
            flow: {
                detail: {
                    type: AuthFlowDetailTypeEnum.Decoupled,
                    bank: Bank.PNZ,
                    identifierType: IdentifierType.PhoneNumber,
                    identifierValue: '+64-259531933',
                    callbackUrl: callbackUrl
                } as DecoupledFlow
            } as AuthFlow,
            amount: {
                currency: AmountCurrencyEnum.NZD,
                total: '1.25'
            } as Amount,
            pcr: {
                particulars: 'particulars',
                code: 'code',
                reference: 'reference'
            } as Pcr
        };

        const createConsentResponseAxiosResponse = await singleConsentsApiInstance.createSingleConsent(request,
                params);
        expect(createConsentResponseAxiosResponse).not.toBeNull();
        const createConsentResponse = createConsentResponseAxiosResponse.data;
        expect(createConsentResponse).not.toBeNull();

        const consentId = createConsentResponse.consentId;
        expect(consentId).not.toBeNull();
        expect(createConsentResponse.redirectUri).toBeUndefined();

        // create payment
        const paymentRequest: PaymentRequest = {
            consentId: consentId
        };
        let paymentId;
        params.idempotencyKey = uuidv4();
        for (let i = 1; i <= 10; i++) {
            console.log(`attempt: ${i}`);
            try {
                const paymentResponse = await apiInstance.createPayment(paymentRequest,
                        params);

                expect(paymentResponse).not.toBeNull();
                const payment = paymentResponse.data;
                paymentId = payment.paymentId;

                break;
            } catch (error) {
                // sleep incrementally
                await new Promise(resolve => setTimeout(resolve, 2000 * i));
            }
        }

        expect(paymentId).not.toBeNull();

        // retrieve payment
        const paymentAxiosResponse = await apiInstance.getPayment(paymentId);
        expect(paymentAxiosResponse).not.toBeNull();
        const payment = paymentAxiosResponse.data;
        expect(payment).not.toBeNull();
        expect(payment.paymentId).toBe(paymentId);
        expect(payment.type).toBe(PaymentTypeEnum.Single);
        expect(payment.status).toBe(PaymentStatusEnum.AcceptedSettlementCompleted);
        expect(payment.acceptedReason).toBe(PaymentAcceptedReasonEnum.SourceBankPaymentSent);
        expect(payment.refunds).toHaveLength(0);
        expect(payment.creationTimestamp).not.toBe(new Date(0));
        expect(payment.statusUpdatedTimestamp).not.toBe(new Date(0));
        const detail = payment.detail;
        expect(detail).not.toBeNull();
        expect(detail.consentId).toBe(consentId);
        expect(detail.accountReferenceId).toBeUndefined();
        expect(detail.enduringPayment).toBeUndefined();
    });

    it('Verify that payment for enduring consent with decoupled flow is created and retrieved', async () => {
        // create enduring consent with decoupled flow
        const now = DateTime.now().setZone('Pacific/Auckland');
        const request: EnduringConsentRequest = {
            type: ConsentDetailTypeEnum.Enduring,
            flow: {
                detail: {
                    type: AuthFlowDetailTypeEnum.Decoupled,
                    bank: Bank.PNZ,
                    identifierType: IdentifierType.PhoneNumber,
                    identifierValue: '+64-259531933',
                    callbackUrl: callbackUrl
                } as DecoupledFlow
            } as AuthFlow,
            maximumAmountPeriod: {
                currency: AmountCurrencyEnum.NZD,
                total: '50.00'
            } as Amount,
            fromTimestamp: now.toJSDate(),
            period: Period.Fortnightly
        };

        const createConsentResponseAxiosResponse = await enduringConsentsApiInstance.createEnduringConsent(request,
                params);
        expect(createConsentResponseAxiosResponse).not.toBeNull();
        const createConsentResponse = createConsentResponseAxiosResponse.data;
        expect(createConsentResponse).not.toBeNull();

        const consentId = createConsentResponse.consentId;
        expect(consentId).not.toBeNull();
        expect(createConsentResponse.redirectUri).toBeUndefined();

        // create payment
        const paymentRequest: PaymentRequest = {
            consentId: consentId,
            enduringPayment: {
                amount: {
                    total: "45.00",
                    currency: AmountCurrencyEnum.NZD
                } as Amount,
                pcr: {
                    particulars: "particulars",
                    code: "code",
                    reference: "reference"
                } as Pcr
            }
        };
        let paymentId;
        params.idempotencyKey = uuidv4();
        for (let i = 1; i <= 10; i++) {
            console.log(`attempt: ${i}`);
            try {
                const paymentResponse = await apiInstance.createPayment(paymentRequest,
                        params);

                expect(paymentResponse).not.toBeNull();
                const payment = paymentResponse.data;
                paymentId = payment.paymentId;

                break;
            } catch (error) {
                // sleep incrementally
                await new Promise(resolve => setTimeout(resolve, 2000 * i));
            }
        }

        expect(paymentId).not.toBeNull();

        // retrieve payment
        const paymentAxiosResponse = await apiInstance.getPayment(paymentId);
        expect(paymentAxiosResponse).not.toBeNull();
        const payment = paymentAxiosResponse.data;
        expect(payment).not.toBeNull();
        expect(payment.paymentId).toBe(paymentId);
        expect(payment.type).toBe(PaymentTypeEnum.Enduring);
        expect(payment.status).toBe(PaymentStatusEnum.AcceptedSettlementCompleted);
        expect(payment.acceptedReason).toBe(PaymentAcceptedReasonEnum.SourceBankPaymentSent);
        expect(payment.refunds).toHaveLength(0);
        expect(payment.creationTimestamp).not.toBe(new Date(0));
        expect(payment.statusUpdatedTimestamp).not.toBe(new Date(0));
        const detail = payment.detail;
        expect(detail).not.toBeNull();
        expect(detail.consentId).toBe(consentId);
        expect(detail.accountReferenceId).toBeUndefined();
        expect(detail.enduringPayment).not.toBeNull();
    });
});
