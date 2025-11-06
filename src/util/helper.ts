import {GenericParameters} from "./types.js";

/**
 * Build request headers.
 * @param requestId the optional request ID
 * @param xCorrelationId the optional correlation ID
 * @param xCustomerIp the optional customer IP address
 * @param xCustomerUserAgent the optional customer user agent
 * @param idempotencyKey the optional idempotency key
 */
export const buildRequestHeaders = ({
                                      requestId,
                                      xCorrelationId,
                                      xCustomerIp,
                                      xCustomerUserAgent,
                                      idempotencyKey,
                                    }: Partial<GenericParameters>): { [key: string]: string } => {
  const headers: { [key: string]: string } = {};
  if (requestId) {
    headers['request-id'] = requestId;
  }
  if (xCorrelationId) {
    headers['x-correlation-id'] = xCorrelationId;
  }
  if (xCustomerIp) {
    headers['x-customer-ip'] = xCustomerIp;
  }
  if (xCustomerUserAgent) {
    headers['x-customer-user-agent'] = xCustomerUserAgent;
  }
  if (idempotencyKey) {
    headers['idempotency-key'] = idempotencyKey;
  }
  return headers;
};