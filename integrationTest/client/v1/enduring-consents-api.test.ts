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
    EnduringConsentRequest,
    EnduringConsentsApiFactory,
    FlowHintTypeEnum,
    GatewayFlow,
    IdentifierType,
    Period,
    RedirectFlow,
    RedirectFlowHint
} from '../../../src';
import {Configuration} from '../../../configuration';
import globalAxios from 'axios';
import {v4 as uuidv4} from 'uuid';
import {DateTime} from 'luxon';

require('dotenv').config();
jest.setTimeout(60000);

describe('EnduringConsentsApi Integration Test', () => {
    const redirectUri = 'https://www.blinkpay.co.nz/sample-merchant-return-page';
    const callbackUrl = 'https://www.mymerchant.co.nz/callback';
    let apiInstance: ReturnType<typeof EnduringConsentsApiFactory>;

    beforeAll(async () => {
        const configuration = Configuration.getInstance(globalAxios);

        apiInstance = EnduringConsentsApiFactory(configuration, undefined, globalAxios);
    });

    it('Verify that enduring consent with redirect flow is created in PNZ', async () => {
        // create
        const now = DateTime.now().setZone('Pacific/Auckland');
        const request: EnduringConsentRequest = {
            type: ConsentDetailTypeEnum.Enduring,
            flow: {
                detail: {
                    type: AuthFlowDetailTypeEnum.Redirect,
                    bank: Bank.PNZ,
                    redirectUri: redirectUri
                } as RedirectFlow
            } as AuthFlow,
            maximumAmountPeriod: {
                currency: AmountCurrencyEnum.NZD,
                total: '50.00'
            } as Amount,
            fromTimestamp: now.toJSDate(),
            period: Period.Fortnightly
        };

        const createConsentResponseAxiosResponse = await apiInstance.createEnduringConsent(request,
            uuidv4(), uuidv4(), "192.168.0.1", uuidv4());
        const createConsentResponse = createConsentResponseAxiosResponse.data;
        expect(createConsentResponse).not.toBeNull();

        const consentId = createConsentResponse.consentId;
        expect(consentId).not.toBeNull();
        expect(createConsentResponse.redirectUri).not.toEqual('');
        expect(createConsentResponse.redirectUri.startsWith('https://api-nomatls.apicentre.middleware.co.nz/middleware-nz-sandbox/v2.0/oauth/authorize?scope=openid%20payments&response_type=code%20id_token')).toBeTruthy();
        expect(createConsentResponse.redirectUri.includes('&request=')).toBeTruthy();
        expect(createConsentResponse.redirectUri.includes('&state=')).toBeTruthy();
        expect(createConsentResponse.redirectUri.includes('&nonce=')).toBeTruthy();
        expect(createConsentResponse.redirectUri.includes('&redirect_uri=')).toBeTruthy();
        expect(createConsentResponse.redirectUri.includes('&client_id=')).toBeTruthy();

        // retrieve
        let consentAxiosResponse = await apiInstance.getEnduringConsent(consentId);
        expect(consentAxiosResponse).not.toBeNull();
        let consent = consentAxiosResponse.data;
        expect(consent).not.toBeNull();
        expect(consent.status).toEqual(ConsentStatusEnum.AwaitingAuthorisation);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isEnduringConsentRequest(consent.detail)) {
            const detail: EnduringConsentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Enduring);

            expect(detail.flow).not.toBeNull();
            if (isRedirectFlow(detail.flow.detail)) {
                const flow: RedirectFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Redirect);
                expect(flow.bank).toEqual(Bank.PNZ);
                expect(flow.redirectUri).toEqual(redirectUri);
            }

            expect(detail.period).toEqual(Period.Fortnightly);

            expect(detail.maximumAmountPeriod).not.toBeNull();
            expect(detail.maximumAmountPeriod.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.maximumAmountPeriod.total).toEqual('50.00');
        }

        // revoke
        await apiInstance.revokeEnduringConsent(consentId);

        consentAxiosResponse = await apiInstance.getEnduringConsent(consentId);
        expect(consentAxiosResponse).not.toBeNull();
        consent = consentAxiosResponse.data;
        expect(consent).not.toBeNull();
        expect(consent.status).toEqual(ConsentStatusEnum.Revoked);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isEnduringConsentRequest(consent.detail)) {
            const detail: EnduringConsentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Enduring);

            expect(detail.flow).not.toBeNull();
            if (isRedirectFlow(detail.flow.detail)) {
                const flow: RedirectFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Redirect);
                expect(flow.bank).toEqual(Bank.PNZ);
                expect(flow.redirectUri).toEqual(redirectUri);
            }

            expect(detail.period).toEqual(Period.Fortnightly);

            expect(detail.maximumAmountPeriod).not.toBeNull();
            expect(detail.maximumAmountPeriod.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.maximumAmountPeriod.total).toEqual('50.00');
        }
    });

    it('Verify that rejected enduring consent with redirect flow is retrieved from PNZ', async () => {
        const consentAxiosResponse = await apiInstance.getEnduringConsent("f0b5fc9e-afa2-441f-a9e7-e2131952b835");
        expect(consentAxiosResponse).not.toBeNull();

        const consent = consentAxiosResponse.data;
        expect(consent).not.toBeNull();
        expect(consent.status).toEqual(ConsentStatusEnum.Rejected);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isEnduringConsentRequest(consent.detail)) {
            const detail: EnduringConsentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Enduring);

            expect(detail.flow).not.toBeNull();
            if (isRedirectFlow(detail.flow.detail)) {
                const flow: RedirectFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Redirect);
                expect(flow.bank).toEqual(Bank.PNZ);
                expect(flow.redirectUri).toEqual(redirectUri);
            }

            expect(detail.period).toEqual(Period.Fortnightly);

            expect(detail.maximumAmountPeriod).not.toBeNull();
            expect(detail.maximumAmountPeriod.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.maximumAmountPeriod.total).toEqual('50.00');
        }
    });

    it('Verify that enduring consent with decoupled flow is created in PNZ', async () => {
        // create
        const now = DateTime.now().setZone('Pacific/Auckland');
        const request: EnduringConsentRequest = {
            type: ConsentDetailTypeEnum.Enduring,
            flow: {
                detail: {
                    type: AuthFlowDetailTypeEnum.Decoupled,
                    bank: Bank.PNZ,
                    identifierType: IdentifierType.PhoneNumber,
                    identifierValue: '+6449144425',
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

        const createConsentResponseAxiosResponse = await apiInstance.createEnduringConsent(request,
            uuidv4(), uuidv4(), "192.168.0.1", uuidv4());
        expect(createConsentResponseAxiosResponse).not.toBeNull();
        const createConsentResponse = createConsentResponseAxiosResponse.data;
        expect(createConsentResponse).not.toBeNull();

        const consentId = createConsentResponse.consentId;
        expect(consentId).not.toBeNull();
        expect(createConsentResponse.redirectUri).toBeUndefined();

        // retrieve
        let consentAxiosResponse = await apiInstance.getEnduringConsent(consentId);
        expect(consentAxiosResponse).not.toBeNull();
        let consent = consentAxiosResponse.data;
        expect(consent).not.toBeNull();
        expect(consent.status).toEqual(ConsentStatusEnum.AwaitingAuthorisation);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isEnduringConsentRequest(consent.detail)) {
            const detail: EnduringConsentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Enduring);

            expect(detail.flow).not.toBeNull();
            if (isDecoupledFlow(detail.flow.detail)) {
                const flow: DecoupledFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Decoupled);
                expect(flow.bank).toEqual(Bank.PNZ);
                expect(flow.callbackUrl).toEqual(callbackUrl);
                expect(flow.identifierType).toEqual(IdentifierType.PhoneNumber);
                expect(flow.identifierValue).toEqual('+6449144425');
            }

            expect(detail.period).toEqual(Period.Fortnightly);

            expect(detail.maximumAmountPeriod).not.toBeNull();
            expect(detail.maximumAmountPeriod.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.maximumAmountPeriod.total).toEqual('50.00');
        }

        // revoke
        await apiInstance.revokeEnduringConsent(consentId);

        consentAxiosResponse = await apiInstance.getEnduringConsent(consentId);
        expect(consentAxiosResponse.status).toEqual(200);
        consent = consentAxiosResponse.data;
        expect(consent).not.toBeNull();
        expect(consent.status).toEqual(ConsentStatusEnum.Revoked);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isEnduringConsentRequest(consent.detail)) {
            const detail: EnduringConsentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Enduring);

            expect(detail.flow).not.toBeNull();
            if (isDecoupledFlow(detail.flow.detail)) {
                const flow: DecoupledFlow = detail.flow.detail;
                expect(flow.type).toEqual(AuthFlowDetailTypeEnum.Decoupled);
                expect(flow.bank).toEqual(Bank.PNZ);
                expect(flow.callbackUrl).toEqual(callbackUrl);
                expect(flow.identifierType).toEqual(IdentifierType.PhoneNumber);
                expect(flow.identifierValue).toEqual('+6449144425');
            }

            expect(detail.period).toEqual(Period.Fortnightly);

            expect(detail.maximumAmountPeriod).not.toBeNull();
            expect(detail.maximumAmountPeriod.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.maximumAmountPeriod.total).toEqual('50.00');
        }
    });

    it('Verify that enduring consent with gateway flow and redirect flow hint is created in PNZ', async () => {
        // create
        const now = DateTime.now().setZone('Pacific/Auckland');
        const request: EnduringConsentRequest = {
            type: ConsentDetailTypeEnum.Enduring,
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
            maximumAmountPeriod: {
                currency: AmountCurrencyEnum.NZD,
                total: '50.00'
            } as Amount,
            fromTimestamp: now.toJSDate(),
            period: Period.Fortnightly
        };

        const createConsentResponseAxiosResponse = await apiInstance.createEnduringConsent(request,
            uuidv4(), uuidv4(), "192.168.0.1", uuidv4());
        const createConsentResponse = createConsentResponseAxiosResponse.data;
        expect(createConsentResponse).not.toBeNull();

        const consentId = createConsentResponse.consentId;
        expect(consentId).not.toBeNull();
        expect(createConsentResponse.redirectUri).not.toEqual('');
        expect(createConsentResponse.redirectUri.endsWith('/gateway/pay?id=' + consentId)).toBeTruthy();

        // retrieve
        let consentAxiosResponse = await apiInstance.getEnduringConsent(consentId);
        expect(consentAxiosResponse).not.toBeNull();
        let consent = consentAxiosResponse.data;
        expect(consent).not.toBeNull();
        expect(consent.status).toEqual(ConsentStatusEnum.GatewayAwaitingSubmission);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isEnduringConsentRequest(consent.detail)) {
            const detail: EnduringConsentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Enduring);

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

            expect(detail.period).toEqual(Period.Fortnightly);

            expect(detail.maximumAmountPeriod).not.toBeNull();
            expect(detail.maximumAmountPeriod.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.maximumAmountPeriod.total).toEqual('50.00');
        }

        // revoke
        await apiInstance.revokeEnduringConsent(consentId);

        consentAxiosResponse = await apiInstance.getEnduringConsent(consentId);
        expect(consentAxiosResponse).not.toBeNull();
        consent = consentAxiosResponse.data;
        expect(consent).not.toBeNull();
        expect(consent.status).toEqual(ConsentStatusEnum.Revoked);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isEnduringConsentRequest(consent.detail)) {
            const detail: EnduringConsentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Enduring);

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

            expect(detail.period).toEqual(Period.Fortnightly);

            expect(detail.maximumAmountPeriod).not.toBeNull();
            expect(detail.maximumAmountPeriod.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.maximumAmountPeriod.total).toEqual('50.00');
        }
    });

    it('Verify that enduring consent with gateway flow and decoupled flow hint is created in PNZ', async () => {
        // create
        const now = DateTime.now().setZone('Pacific/Auckland');
        const request: EnduringConsentRequest = {
            type: ConsentDetailTypeEnum.Enduring,
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
            maximumAmountPeriod: {
                currency: AmountCurrencyEnum.NZD,
                total: '50.00'
            } as Amount,
            fromTimestamp: now.toJSDate(),
            period: Period.Fortnightly
        };

        const createConsentResponseAxiosResponse = await apiInstance.createEnduringConsent(request,
            uuidv4(), uuidv4(), "192.168.0.1", uuidv4());
        expect(createConsentResponseAxiosResponse).not.toBeNull();
        const createConsentResponse = createConsentResponseAxiosResponse.data;
        expect(createConsentResponse).not.toBeNull();

        const consentId = createConsentResponse.consentId;
        expect(consentId).not.toBeNull();
        expect(createConsentResponse.redirectUri.endsWith('/gateway/pay?id=' + consentId)).toBeTruthy();

        // retrieve
        let consentAxiosResponse = await apiInstance.getEnduringConsent(consentId);
        expect(consentAxiosResponse).not.toBeNull();
        let consent = consentAxiosResponse.data;
        expect(consent).not.toBeNull();
        expect(consent.status).toEqual(ConsentStatusEnum.GatewayAwaitingSubmission);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isEnduringConsentRequest(consent.detail)) {
            const detail: EnduringConsentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Enduring);

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

            expect(detail.period).toEqual(Period.Fortnightly);

            expect(detail.maximumAmountPeriod).not.toBeNull();
            expect(detail.maximumAmountPeriod.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.maximumAmountPeriod.total).toEqual('50.00');
        }

        // revoke
        await apiInstance.revokeEnduringConsent(consentId);

        consentAxiosResponse = await apiInstance.getEnduringConsent(consentId);
        expect(consentAxiosResponse.status).toEqual(200);
        consent = consentAxiosResponse.data;
        expect(consent).not.toBeNull();
        expect(consent.status).toEqual(ConsentStatusEnum.Revoked);
        expect(consent.accounts).toBeUndefined();
        expect(consent.payments).toEqual([]);
        expect(consent.creationTimestamp).not.toBeNull();
        expect(consent.statusUpdatedTimestamp).not.toBeNull();

        expect(consent.detail).not.toBeNull();
        if (isEnduringConsentRequest(consent.detail)) {
            const detail: EnduringConsentRequest = consent.detail;
            expect(detail.type).toEqual(ConsentDetailTypeEnum.Enduring);

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

            expect(detail.period).toEqual(Period.Fortnightly);

            expect(detail.maximumAmountPeriod).not.toBeNull();
            expect(detail.maximumAmountPeriod.currency).toEqual(AmountCurrencyEnum.NZD);
            expect(detail.maximumAmountPeriod.total).toEqual('50.00');
        }
    });
});

function isEnduringConsentRequest(object: any): object is EnduringConsentRequest {
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
