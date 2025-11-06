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
    AmountCurrencyEnum,
    Bank,
    BankMetadata,
    BankMetadataApiFactory,
    CardNetwork,
    CardPaymentType,
    IdentifierType
} from '../../../src';
import {Configuration} from '../../../configuration';
import globalAxios from 'axios';

require('dotenv').config();
jest.setTimeout(30000);

describe('BankMetadataApi Integration Test', () => {
    let apiInstance: ReturnType<typeof BankMetadataApiFactory>;

    beforeAll(async (): Promise<void> => {
        const configuration = new Configuration(globalAxios);

        apiInstance = BankMetadataApiFactory(globalAxios, configuration, undefined);
    });

    it('Verify that bank metadata is retrieved', async () => {
        const response = await apiInstance.getMeta();
        expect(response.data).toBeInstanceOf(Array);
        expect(response.status).toEqual(200);
        const actual = response.data;
        expect(actual.length).toBeGreaterThanOrEqual(1);

        // Verify each bank has required fields
        actual.forEach((bank: BankMetadata) => {
            expect(bank.name).toBeDefined();
            expect(bank.features).toBeDefined();
        });
    });
});
