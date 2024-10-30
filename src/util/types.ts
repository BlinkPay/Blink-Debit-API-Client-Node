import {AxiosRequestConfig} from "axios";

/**
 * Generic parameters for API requests.
 * Includes optional headers like requestId, xCorrelationId, xCustomerIp, xCustomerUserAgent, and idempotencyKey.
 * Can also include AxiosRequestConfig for further request customization.
 */
export type GenericParameters = {
  requestId?: string;
  xCorrelationId?: string;
  xCustomerIp?: string;
  xCustomerUserAgent?: string;
  idempotencyKey?: string;
  options?: AxiosRequestConfig;
};