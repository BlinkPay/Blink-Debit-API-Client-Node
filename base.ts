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

import {Configuration} from './configuration';
import {AxiosInstance, AxiosRequestConfig} from 'axios';
import {BlinkInvalidValueException} from './src';

/**
 * The request arguments.
 *
 * @export
 * @interface RequestArgs
 */
export interface RequestArgs {
    url: string;
    options: AxiosRequestConfig;
}

/**
 * The base API.
 *
 * @export
 * @class BaseAPI
 */
export class BaseAPI {
    protected configuration: Configuration | undefined;
    protected axios: AxiosInstance;

    constructor(axios: AxiosInstance, configuration?: Configuration, protected basePath?: string) {
        if (!axios) {
            throw new BlinkInvalidValueException("Axios instance is required");
        }
        this.axios = axios;

        if (configuration) {
            this.configuration = configuration;
            this.basePath = configuration.basePath || this.basePath;
        }
    }
}
