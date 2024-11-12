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

import {AmountCurrencyEnum, Bank, BankMetadata, BankMetadataApiFactory, IdentifierType} from '../../../src';
import {Configuration} from '../../../configuration';
import globalAxios from 'axios';

require('dotenv').config();
jest.setTimeout(30000);

describe('BankMetadataApi Integration Test', () => {
    let apiInstance: ReturnType<typeof BankMetadataApiFactory>;

    beforeAll(async (): Promise<void> => {
        const configuration = Configuration.getInstance(globalAxios);

        apiInstance = BankMetadataApiFactory(globalAxios, configuration, undefined);
    });

    it('Verify that bank metadata is retrieved', async () => {
        const response = await apiInstance.getMeta();
        expect(response.data).toBeInstanceOf(Array);
        expect(response.status).toEqual(200);
        const actual = response.data;
        expect(actual.length).toEqual(5);

        const bnz: BankMetadata = {
            name: Bank.BNZ,
            paymentLimit: {
                total: "50000",
                currency: AmountCurrencyEnum.NZD
            },
            features: {
                enduringConsent: {
                    consentIndefinite: false,
                    enabled: true
                },
                decoupledFlow: {
                    enabled: true,
                    availableIdentifiers: [
                        {
                            type: IdentifierType.ConsentId,
                            name: "Consent ID"
                        }
                    ],
                    requestTimeout: "PT4M"
                }
            },
            redirectFlow: {
                enabled: true,
                requestTimeout: "PT5M"
            }
        };

        const pnz: BankMetadata = {
            name: Bank.PNZ,
            paymentLimit: {
                total: "50000",
                currency: AmountCurrencyEnum.NZD
            },
            features: {
                enduringConsent: {
                    enabled: true,
                    consentIndefinite: true
                },
                decoupledFlow: {
                    enabled: true,
                    availableIdentifiers: [
                        {
                            type: IdentifierType.PhoneNumber,
                            name: "Phone Number"
                        },
                        {
                            type: IdentifierType.MobileNumber,
                            name: "Mobile Number"
                        }
                    ],
                    requestTimeout: "PT3M"
                }
            },
            redirectFlow: {
                enabled: true,
                requestTimeout: "PT10M"
            }
        };

        const westpac: BankMetadata = {
            name: Bank.Westpac,
            paymentLimit: {
                total: "10000",
                currency: AmountCurrencyEnum.NZD
            },
            features: {
                enduringConsent: undefined,
                decoupledFlow: undefined
            },
            redirectFlow: {
                enabled: true,
                requestTimeout: "PT10M"
            }
        };

        const asb: BankMetadata = {
            name: Bank.ASB,
            paymentLimit: {
                total: "30000",
                currency: AmountCurrencyEnum.NZD
            },
            features: {
                enduringConsent: {
                    consentIndefinite: false,
                    enabled: true
                },
                decoupledFlow: undefined
            },
            redirectFlow: {
                enabled: true,
                requestTimeout: "PT10M"
            }
        };

        const anz: BankMetadata = {
            name: Bank.ANZ,
            paymentLimit: {
                total: "1000",
                currency: AmountCurrencyEnum.NZD
            },
            features: {
                enduringConsent: undefined,
                decoupledFlow: {
                    enabled: true,
                    availableIdentifiers: [
                        {
                            type: IdentifierType.MobileNumber,
                            name: "Mobile Number"
                        }
                    ],
                    requestTimeout: "PT7M"
                }
            },
            redirectFlow: {
                enabled: true,
                requestTimeout: "PT10M"
            }
        };

        expect(actual).toEqual(expect.arrayContaining([bnz, pnz, asb, westpac, anz]));
    });
});
