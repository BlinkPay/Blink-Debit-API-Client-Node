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

import {Bank, BankMetadata, BankMetadataApiFactory, IdentifierType} from '../../../src';
import {Configuration} from '../../../configuration';
import globalAxios from 'axios';

require('dotenv').config();
jest.setTimeout(30000);

describe('BankMetadataApi Integration Test', () => {
    let apiInstance: ReturnType<typeof BankMetadataApiFactory>;

    beforeAll(async () => {
        const configuration = Configuration.getInstance();

        apiInstance = BankMetadataApiFactory(configuration, undefined, globalAxios);
    });

    it('Verify that bank metadata is retrieved', async () => {
        const response = await apiInstance.getMeta();
        expect(response.data).toBeInstanceOf(Array);
        expect(response.status).toEqual(200);
        const actual = response.data;
        expect(actual.length).toEqual(5);

        const bnz: BankMetadata = {
            name: Bank.BNZ,
            features: {
                enduringConsent: undefined,
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
            features: {
                enduringConsent: undefined,
                decoupledFlow: undefined
            },
            redirectFlow: {
                enabled: true,
                requestTimeout: "PT10M"
            }
        };

        const anz: BankMetadata = {
            name: Bank.ANZ,
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
                enabled: false,
                requestTimeout: undefined
            }
        };

        expect(actual).toEqual(expect.arrayContaining([bnz, pnz, westpac, anz, asb]));
    });
});
