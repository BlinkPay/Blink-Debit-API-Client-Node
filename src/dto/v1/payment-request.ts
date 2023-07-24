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

import {EnduringPaymentRequest} from './enduring-payment-request';

/**
 * The payment request model.
 *
 * @export
 * @interface PaymentRequest
 */
export interface PaymentRequest {
    /**
     * The consent ID
     * @type {string}
     * @memberof PaymentRequest
     */
    consentId: string;
    /**
     *
     * @type {EnduringPaymentRequest}
     * @memberof PaymentRequest
     */
    enduringPayment?: EnduringPaymentRequest;
    /**
     * The account reference ID from account list. This is required if the account selection information was provided to you on the consents endpoint.
     * @type {string}
     * @memberof PaymentRequest
     */
    accountReferenceId?: string;
}
