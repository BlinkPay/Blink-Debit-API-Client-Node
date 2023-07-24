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
    ConsentStatusEnum,
    DecoupledFlow,
    DecoupledFlowHint,
    FlowHintTypeEnum,
    GatewayFlow,
    IdentifierType,
    Pcr,
    QuickPaymentRequest,
    QuickPaymentsApiFactory,
    RedirectFlow,
    RedirectFlowHint
} from '../../../src';
import {Configuration} from '../../../configuration';
import globalAxios from 'axios';
import {v4 as uuidv4} from 'uuid';

require('dotenv').config();
jest.setTimeout(60000);

describe('QuickPaymentsApi Integration Test', () => {
    const redirectUri = 'https://www.blinkpay.co.nz/sample-merchant-return-page';
    const callbackUrl = 'https://www.mymerchant.co.nz/callback';
    let apiInstance: ReturnType<typeof QuickPaymentsApiFactory>;

    beforeAll(async () => {
        const configuration = Configuration.getInstance();

        apiInstance = QuickPaymentsApiFactory(configuration, undefined, globalAxios);
    });

    it('Verify that quick payment with redirect flow is created in PNZ', async () => {
        // create
        const request: QuickPaymentRequest = {
            type: ConsentDetailTypeEnum.Single,
            flow: {
                detail: {
                    type: AuthFlowDetailTypeEnum.Redirect,
                    bank: Bank.PNZ,
                    redirectUri: redirectUri
                } as RedirectFlow
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

        const createQuickPaymentResponseAxiosResponse = await apiInstance.createQuickPayment(request,
            uuidv4(), uuidv4(), "192.168.0.1", uuidv4());
        const createQuickPaymentResponse = createQuickPaymentResponseAxiosResponse.data;
        expect(createQuickPaymentResponse).not.toBeNull();

        const quickPaymentId = createQuickPaymentResponse.quickPaymentId;
        expect(quickPaymentId).not.toBeNull();
        expect(createQuickPaymentResponse.redirectUri).not.toEqual('');
        expect(createQuickPaymentResponse.redirectUri.startsWith('https://api-nomatls.apicentre.middleware.co.nz/middleware-nz-sandbox/v2.0/oauth/authorize?scope=openid%20payments&response_type=code%20id_token')).toBeTruthy();
        expect(createQuickPaymentResponse.redirectUri.includes('&request=')).toBeTruthy();
        expect(createQuickPaymentResponse.redirectUri.includes('&state=')).toBeTruthy();
        expect(createQuickPaymentResponse.redirectUri.includes('&nonce=')).toBeTruthy();
        expect(createQuickPaymentResponse.redirectUri.includes('&redirect_uri=')).toBeTruthy();
        expect(createQuickPaymentResponse.redirectUri.includes('&client_id=')).toBeTruthy();

        // retrieve
        let quickPaymentAxiosResponse = await apiInstance.getQuickPayment(quickPaymentId);
        expect(quickPaymentAxiosResponse).not.toBeNull();
        let quickPayment = quickPaymentAxiosResponse.data;
        expect(quickPayment).not.toBeNull();
        let consent = quickPayment.consent;
        expect(consent.status).toEqual(ConsentStatusEnum.AwaitingAuthorisation);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isQuickPaymentRequest(consent.detail)) {
            const detail: QuickPaymentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Single);

            expect(detail.flow).not.toBeNull();
            if (isRedirectFlow(detail.flow.detail)) {
                const flow: RedirectFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Redirect);
                expect(flow.bank).toEqual(Bank.PNZ);
                expect(flow.redirectUri).toEqual(redirectUri);
            }

            expect(detail.pcr).not.toBeNull();
            expect(detail.pcr.particulars).toEqual('particulars');
            expect(detail.pcr.code).toEqual('code');
            expect(detail.pcr.reference).toEqual('reference');

            expect(detail.amount).not.toBeNull();
            expect(detail.amount.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.amount.total).toEqual('1.25');
        }

        // revoke
        await apiInstance.revokeQuickPayment(quickPaymentId);

        quickPaymentAxiosResponse = await apiInstance.getQuickPayment(quickPaymentId);
        expect(quickPaymentAxiosResponse).not.toBeNull();
        quickPayment = quickPaymentAxiosResponse.data;
        expect(quickPayment).not.toBeNull();
        consent = quickPayment.consent;
        expect(consent.status).toEqual(ConsentStatusEnum.Revoked);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isQuickPaymentRequest(consent.detail)) {
            const detail: QuickPaymentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Single);

            expect(detail.flow).not.toBeNull();
            if (isRedirectFlow(detail.flow.detail)) {
                const flow: RedirectFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Redirect);
                expect(flow.bank).toEqual(Bank.PNZ);
                expect(flow.redirectUri).toEqual(redirectUri);
            }

            expect(detail.pcr).not.toBeNull();
            expect(detail.pcr.particulars).toEqual('particulars');
            expect(detail.pcr.code).toEqual('code');
            expect(detail.pcr.reference).toEqual('reference');

            expect(detail.amount).not.toBeNull();
            expect(detail.amount.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.amount.total).toEqual('1.25');
        }
    });

    it('Verify that rejected quick payment with redirect flow is retrieved from PNZ', async () => {
        const quickPaymentAxiosResponse = await apiInstance.getQuickPayment("057a08f7-4ee1-499d-8726-e4fe802d64fc");
        expect(quickPaymentAxiosResponse).not.toBeNull();

        const quickPayment = quickPaymentAxiosResponse.data;
        expect(quickPayment).not.toBeNull();
        let consent = quickPayment.consent;
        expect(consent.status).toEqual(ConsentStatusEnum.Rejected);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isQuickPaymentRequest(consent.detail)) {
            const detail: QuickPaymentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Single);

            expect(detail.flow).not.toBeNull();
            if (isRedirectFlow(detail.flow.detail)) {
                const flow: RedirectFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Redirect);
                expect(flow.bank).toEqual(Bank.PNZ);
                expect(flow.redirectUri).toEqual(redirectUri);
            }

            expect(detail.pcr).not.toBeNull();
            expect(detail.pcr.particulars).toEqual('particulars');
            expect(detail.pcr.code).toEqual('code');
            expect(detail.pcr.reference).toEqual('reference');

            expect(detail.amount).not.toBeNull();
            expect(detail.amount.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.amount.total).toEqual('1.50');
        }
    });

    it('Verify that quick payment with decoupled flow is created in PNZ', async () => {
        // create
        const request: QuickPaymentRequest = {
            type: ConsentDetailTypeEnum.Single,
            flow: {
                detail: {
                    type: AuthFlowDetailTypeEnum.Decoupled,
                    bank: Bank.PNZ,
                    identifierType: IdentifierType.PhoneNumber,
                    identifierValue: '+6449144425',
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

        const createQuickPaymentResponseAxiosResponse = await apiInstance.createQuickPayment(request,
            uuidv4(), uuidv4(), "192.168.0.1", uuidv4());
        expect(createQuickPaymentResponseAxiosResponse).not.toBeNull();
        const createQuickPaymentResponse = createQuickPaymentResponseAxiosResponse.data;
        expect(createQuickPaymentResponse).not.toBeNull();

        const quickPaymentId = createQuickPaymentResponse.quickPaymentId;
        expect(quickPaymentId).not.toBeNull();
        expect(createQuickPaymentResponse.redirectUri).toBeUndefined();

        // retrieve
        let quickPaymentAxiosResponse = await apiInstance.getQuickPayment(quickPaymentId);
        expect(quickPaymentAxiosResponse).not.toBeNull();
        let quickPayment = quickPaymentAxiosResponse.data;
        expect(quickPayment).not.toBeNull();
        let consent = quickPayment.consent;
        expect(consent.status).toEqual(ConsentStatusEnum.AwaitingAuthorisation);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isQuickPaymentRequest(consent.detail)) {
            const detail: QuickPaymentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Single);

            expect(detail.flow).not.toBeNull();
            if (isDecoupledFlow(detail.flow.detail)) {
                const flow: DecoupledFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Decoupled);
                expect(flow.bank).toEqual(Bank.PNZ);
                expect(flow.callbackUrl).toEqual(callbackUrl);
                expect(flow.identifierType).toEqual(IdentifierType.PhoneNumber);
                expect(flow.identifierValue).toEqual('+6449144425');
            }

            expect(detail.pcr).not.toBeNull();
            expect(detail.pcr.particulars).toEqual('particulars');
            expect(detail.pcr.code).toEqual('code');
            expect(detail.pcr.reference).toEqual('reference');

            expect(detail.amount).not.toBeNull();
            expect(detail.amount.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.amount.total).toEqual('1.25');
        }

        // revoke
        await apiInstance.revokeQuickPayment(quickPaymentId);

        quickPaymentAxiosResponse = await apiInstance.getQuickPayment(quickPaymentId);
        expect(quickPaymentAxiosResponse.status).toEqual(200);
        quickPayment = quickPaymentAxiosResponse.data;
        expect(quickPayment).not.toBeNull();
        consent = quickPayment.consent;
        expect(consent.status).toEqual(ConsentStatusEnum.Revoked);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isQuickPaymentRequest(consent.detail)) {
            const detail: QuickPaymentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Single);

            expect(detail.flow).not.toBeNull();
            if (isDecoupledFlow(detail.flow.detail)) {
                const flow: DecoupledFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Decoupled);
                expect(flow.bank).toEqual(Bank.PNZ);
                expect(flow.callbackUrl).toEqual(callbackUrl);
                expect(flow.identifierType).toEqual(IdentifierType.PhoneNumber);
                expect(flow.identifierValue).toEqual('+6449144425');
            }

            expect(detail.pcr).not.toBeNull();
            expect(detail.pcr.particulars).toEqual('particulars');
            expect(detail.pcr.code).toEqual('code');
            expect(detail.pcr.reference).toEqual('reference');

            expect(detail.amount).not.toBeNull();
            expect(detail.amount.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.amount.total).toEqual('1.25');
        }
    });

    it('Verify that quick payment with gateway flow and redirect flow hint is created in PNZ', async () => {
        // create
        const request: QuickPaymentRequest = {
            type: ConsentDetailTypeEnum.Single,
            flow: {
                detail: {
                    type: AuthFlowDetailTypeEnum.Gateway,
                    redirectUri: redirectUri,
                    flowHint: {
                        type: FlowHintTypeEnum.Redirect,
                        bank: Bank.PNZ
                    } as RedirectFlowHint
                } as GatewayFlow
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

        const createQuickPaymentResponseAxiosResponse = await apiInstance.createQuickPayment(request,
            uuidv4(), uuidv4(), "192.168.0.1", uuidv4());
        const createQuickPaymentResponse = createQuickPaymentResponseAxiosResponse.data;
        expect(createQuickPaymentResponse).not.toBeNull();

        const quickPaymentId = createQuickPaymentResponse.quickPaymentId;
        expect(quickPaymentId).not.toBeNull();
        expect(createQuickPaymentResponse.redirectUri).not.toEqual('');
        expect(createQuickPaymentResponse.redirectUri.endsWith('/gateway/pay?id=' + quickPaymentId)).toBeTruthy();

        // retrieve
        let quickPaymentAxiosResponse = await apiInstance.getQuickPayment(quickPaymentId);
        expect(quickPaymentAxiosResponse).not.toBeNull();
        let quickPayment = quickPaymentAxiosResponse.data;
        expect(quickPayment).not.toBeNull();
        let consent = quickPayment.consent;
        expect(consent.status).toEqual(ConsentStatusEnum.GatewayAwaitingSubmission);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isQuickPaymentRequest(consent.detail)) {
            const detail: QuickPaymentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Single);

            expect(detail.flow).not.toBeNull();
            if (isGatewayFlow(detail.flow.detail)) {
                const flow: GatewayFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Gateway);
                expect(flow.redirectUri).toEqual(redirectUri);

                expect(flow.flowHint).not.toBeNull();
                if (isRedirectFlowHint(flow.flowHint)) {
                    const flowHint: RedirectFlowHint = flow.flowHint;
                    expect(flowHint.type).toEqual(FlowHintTypeEnum.Redirect)
                    expect(flowHint.bank).toEqual(Bank.PNZ);
                }
            }

            expect(detail.pcr).not.toBeNull();
            expect(detail.pcr.particulars).toEqual('particulars');
            expect(detail.pcr.code).toEqual('code');
            expect(detail.pcr.reference).toEqual('reference');

            expect(detail.amount).not.toBeNull();
            expect(detail.amount.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.amount.total).toEqual('1.25');
        }

        // revoke
        await apiInstance.revokeQuickPayment(quickPaymentId);

        quickPaymentAxiosResponse = await apiInstance.getQuickPayment(quickPaymentId);
        expect(quickPaymentAxiosResponse).not.toBeNull();
        quickPayment = quickPaymentAxiosResponse.data;
        expect(quickPayment).not.toBeNull();
        consent = quickPayment.consent;
        expect(consent.status).toEqual(ConsentStatusEnum.Revoked);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isQuickPaymentRequest(consent.detail)) {
            const detail: QuickPaymentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Single);

            expect(detail.flow).not.toBeNull();
            if (isGatewayFlow(detail.flow.detail)) {
                const flow: GatewayFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Gateway);
                expect(flow.redirectUri).toEqual(redirectUri);

                expect(flow.flowHint).not.toBeNull();
                if (isRedirectFlowHint(flow.flowHint)) {
                    const flowHint: RedirectFlowHint = flow.flowHint;
                    expect(flowHint.type).toEqual(FlowHintTypeEnum.Redirect)
                    expect(flowHint.bank).toEqual(Bank.PNZ);
                }
            }

            expect(detail.pcr).not.toBeNull();
            expect(detail.pcr.particulars).toEqual('particulars');
            expect(detail.pcr.code).toEqual('code');
            expect(detail.pcr.reference).toEqual('reference');

            expect(detail.amount).not.toBeNull();
            expect(detail.amount.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.amount.total).toEqual('1.25');
        }
    });

    it('Verify that quick payment with gateway flow and decoupled flow hint is created in PNZ', async () => {
        // create
        const request: QuickPaymentRequest = {
            type: ConsentDetailTypeEnum.Single,
            flow: {
                detail: {
                    type: AuthFlowDetailTypeEnum.Gateway,
                    redirectUri: redirectUri,
                    flowHint: {
                        type: FlowHintTypeEnum.Decoupled,
                        bank: Bank.PNZ,
                        identifierType: IdentifierType.PhoneNumber,
                        identifierValue: '+6449144425'
                    } as DecoupledFlowHint
                } as GatewayFlow
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

        const createQuickPaymentResponseAxiosResponse = await apiInstance.createQuickPayment(request,
            uuidv4(), uuidv4(), "192.168.0.1", uuidv4());
        expect(createQuickPaymentResponseAxiosResponse).not.toBeNull();
        const createQuickPaymentResponse = createQuickPaymentResponseAxiosResponse.data;
        expect(createQuickPaymentResponse).not.toBeNull();

        const quickPaymentId = createQuickPaymentResponse.quickPaymentId;
        expect(quickPaymentId).not.toBeNull();
        expect(createQuickPaymentResponse.redirectUri.endsWith('/gateway/pay?id=' + quickPaymentId)).toBeTruthy();

        // retrieve
        let quickPaymentAxiosResponse = await apiInstance.getQuickPayment(quickPaymentId);
        expect(quickPaymentAxiosResponse).not.toBeNull();
        let quickPayment = quickPaymentAxiosResponse.data;
        expect(quickPayment).not.toBeNull();
        let consent = quickPayment.consent;
        expect(consent.status).toEqual(ConsentStatusEnum.GatewayAwaitingSubmission);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isQuickPaymentRequest(consent.detail)) {
            const detail: QuickPaymentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Single);

            expect(detail.flow).not.toBeNull();
            if (isGatewayFlow(detail.flow.detail)) {
                const flow: GatewayFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Gateway);
                expect(flow.redirectUri).toEqual(redirectUri);

                expect(flow.flowHint).not.toBeNull();
                if (isDecoupledFlowHint(flow.flowHint)) {
                    const flowHint: DecoupledFlowHint = flow.flowHint;
                    expect(flowHint.type).toEqual(FlowHintTypeEnum.Decoupled)
                    expect(flowHint.bank).toEqual(Bank.PNZ);
                    expect(flowHint.identifierType).toEqual(IdentifierType.PhoneNumber);
                    expect(flowHint.identifierValue).toEqual('+6449144425');
                }
            }

            expect(detail.pcr).not.toBeNull();
            expect(detail.pcr.particulars).toEqual('particulars');
            expect(detail.pcr.code).toEqual('code');
            expect(detail.pcr.reference).toEqual('reference');

            expect(detail.amount).not.toBeNull();
            expect(detail.amount.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.amount.total).toEqual('1.25');
        }

        // revoke
        await apiInstance.revokeQuickPayment(quickPaymentId);

        quickPaymentAxiosResponse = await apiInstance.getQuickPayment(quickPaymentId);
        expect(quickPaymentAxiosResponse.status).toEqual(200);
        quickPayment = quickPaymentAxiosResponse.data;
        expect(quickPayment).not.toBeNull();
        consent = quickPayment.consent;
        expect(consent.status).toEqual(ConsentStatusEnum.Revoked);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isQuickPaymentRequest(consent.detail)) {
            const detail: QuickPaymentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Single);

            expect(detail.flow).not.toBeNull();
            if (isGatewayFlow(detail.flow.detail)) {
                const flow: GatewayFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Gateway);
                expect(flow.redirectUri).toEqual(redirectUri);

                expect(flow.flowHint).not.toBeNull();
                if (isDecoupledFlowHint(flow.flowHint)) {
                    const flowHint: DecoupledFlowHint = flow.flowHint;
                    expect(flowHint.type).toEqual(FlowHintTypeEnum.Decoupled)
                    expect(flowHint.bank).toEqual(Bank.PNZ);
                    expect(flowHint.identifierType).toEqual(IdentifierType.PhoneNumber);
                    expect(flowHint.identifierValue).toEqual('+6449144425');
                }
            }

            expect(detail.pcr).not.toBeNull();
            expect(detail.pcr.particulars).toEqual('particulars');
            expect(detail.pcr.code).toEqual('code');
            expect(detail.pcr.reference).toEqual('reference');

            expect(detail.amount).not.toBeNull();
            expect(detail.amount.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.amount.total).toEqual('1.25');
        }
    });
});

function isQuickPaymentRequest(object: any): object is QuickPaymentRequest {
    return 'type' in object;
}

function isRedirectFlow(object: any): object is RedirectFlow {
    return 'type' in object;
}

function isDecoupledFlow(object: any): object is DecoupledFlow {
    return 'type' in object;
}

function isGatewayFlow(object: any): object is GatewayFlow {
    return 'type' in object;
}

function isRedirectFlowHint(object: any): object is RedirectFlowHint {
    return 'type' in object;
}

function isDecoupledFlowHint(object: any): object is DecoupledFlowHint {
    return 'type' in object;
}
