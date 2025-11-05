# Blink-Debit-API-Client-Node
[![CI](https://github.com/BlinkPay/Blink-Debit-API-Client-Node/actions/workflows/build.yml/badge.svg)](https://github.com/BlinkPay/Blink-Debit-API-Client-Node/actions/workflows/build.yml)
[![NPM](https://img.shields.io/npm/v/blink-debit-api-client-node.svg)](https://npmjs.org/package/blink-debit-api-client-node)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=blink-debit-api-client-node&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=blink-debit-api-client-node)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=blink-debit-api-client-node&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=blink-debit-api-client-node)
[![Snyk security](https://img.shields.io/badge/Snyk_security-monitored-9043C6)](https://app.snyk.io/org/blinkpay-zw9/project/bac031c3-97b5-430a-b642-0ccf1302441c)

# Table of Contents
1. [Introduction](#introduction)
2. [Contributing](#contributing)
3. [Minimum Requirements](#minimum-requirements)
4. [Dependency](#adding-the-dependency)
5. [Quick Start](#quick-start)
6. [Configuration](#configuration)
7. [Client Creation](#client-creation)
8. [Request ID, Correlation ID and Idempotency Key](#request-id-correlation-id-and-idempotency-key)
9. [Full Examples](#full-examples)
10. [Individual API Call Examples](#individual-api-call-examples)

## Introduction
This SDK allows merchants with TypeScript- or JavaScript-based backends to integrate with Blink PayNow and Blink AutoPay.

This SDK was written in TypeScript 5.

## ⚠️ Security Warning

**This SDK is for SERVER-SIDE use only.**

**NEVER use this SDK in browser/frontend JavaScript** (React components, Vue components, Angular components, etc.).

Your OAuth2 client credentials (`client_id` and `client_secret`) would be exposed in the browser bundle, allowing attackers to steal them and make unauthorized payments from your merchant account.

**Valid use cases:**
- ✅ Node.js backend servers
- ✅ Next.js API routes (in `/pages/api/` or `/app/api/`)
- ✅ Express.js / Fastify / NestJS servers
- ✅ Serverless functions (AWS Lambda, Vercel Functions, etc.)
- ❌ React/Vue/Angular components
- ❌ Browser JavaScript
- ❌ Mobile app WebViews

**Proper architecture:**
Your frontend should call YOUR backend API, which then uses this SDK to communicate with BlinkPay.

## Contributing
We welcome contributions from the community. Your pull request will be reviewed by our team.

This project is licensed under the MIT License.

## Minimum Requirements
- Axios 1.12
- Node.js 22.10 LTS

## Adding the dependency
- Install via NPM
```shell
npm install blink-debit-api-client-node --save
```

## Quick Start
Append the BlinkPay environment variables to your `.env` file.
```dotenv
BLINKPAY_DEBIT_URL=https://sandbox.debit.blinkpay.co.nz
BLINKPAY_CLIENT_ID=...
BLINKPAY_CLIENT_SECRET=...
BLINKPAY_RETRY_ENABLED=true
BLINKPAY_TIMEOUT=10000
```

Create and use the client:
- `sample.js`
```javascript
import axios from 'axios';
import log from 'loglevel';
import { BlinkDebitClient, AuthFlowDetailTypeEnum, AmountCurrencyEnum } from 'blink-debit-api-client-node';

const client = new BlinkDebitClient(axios);

const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: "https://www.blinkpay.co.nz/sample-merchant-return-page"
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: '0.01'
    },
    pcr: {
        particulars: 'particulars',
        code: 'code',
        reference: 'reference'
    }
};

async function createQuickPayment() {
    const qpCreateResponse = await client.createQuickPayment(request);
    log.info("Redirect URL: {}", qpCreateResponse.redirectUri); // Redirect the consumer to this URL
    const qpId = qpCreateResponse.quickPaymentId;
    const qpResponse = await client.awaitSuccessfulQuickPaymentOrThrowException(qpId, 300); // Will throw an exception if the payment was not successful after 5min
}

await createQuickPayment();
```
- `sample.ts`
```typescript
import axios from 'axios';
import log from 'loglevel';
import { BlinkDebitClient, QuickPaymentRequest, AuthFlowDetailTypeEnum, GatewayFlow, AuthFlow, AmountCurrencyEnum, Amount, Pcr } from 'blink-debit-api-client-node';

const client = new BlinkDebitClient(axios);

const request: QuickPaymentRequest = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: "https://www.blinkpay.co.nz/sample-merchant-return-page"
        } as GatewayFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: '0.01'
    } as Amount,
    pcr: {
        particulars: 'particulars',
        code: 'code',
        reference: 'reference'
    } as Pcr
};

async function createQuickPayment() {
    const qpCreateResponse = await client.createQuickPayment(request);
    log.info("Redirect URL: {}", qpCreateResponse.redirectUri); // Redirect the consumer to this URL
    const qpId = qpCreateResponse.quickPaymentId;
    const qpResponse = await client.awaitSuccessfulQuickPaymentOrThrowException(qpId, 300); // Will throw an exception if the payment was not successful after 5min
}

await createQuickPayment();
```

## Configuration
- Customise/supply the required properties in your `config.json` and `.env`. This file should be available in your project folder.
- The BlinkPay **Sandbox** debit URL is `https://sandbox.debit.blinkpay.co.nz` and the **production** debit URL is `https://debit.blinkpay.co.nz`.
- The client credentials will be provided to you by BlinkPay as part of your on-boarding process.
> **Warning** Take care not to check in your client ID and secret to your source control.

### Configuration precedence
Configuration will be detected and loaded according to the hierarchy -
1. `.env`
2. `config.json` (`Node.js environment`)
3. Default values

### Configuration examples

#### .env file for Node.js environment
This file is NOT pushed to the repository.
```dotenv
BLINKPAY_DEBIT_URL=<BLINKPAY_DEBIT_URL>
BLINKPAY_CLIENT_ID=<BLINKPAY_CLIENT_ID>
BLINKPAY_CLIENT_SECRET=<BLINKPAY_CLIENT_SECRET>
BLINKPAY_TIMEOUT=10000
BLINKPAY_RETRY_ENABLED=true
```

### config.json file for Node.js environment
Substitute the correct values in your `config.json` file. Since this file can be pushed to your repository, make sure that the client secret is not included.
```json
{
  "blinkpay": {
    "debitUrl": "${BLINKPAY_DEBIT_URL}",
    "timeout": 10000,
    "retryEnabled": true
  }
}
```

## Client creation
In a `Node.js environment`, if you've configured the `.env` file locally or via CI/CD, you can just create the client with:
```javascript
const client = new BlinkDebitClient(axios);
```

Another way is to pass the path to a JSON configuration file:
```javascript
const directory = '/path/to/config/directory';
const fileName = 'my-config.json'
const client = new BlinkDebitClient(axios, directory, fileName);
```

Alternatively, the client can be created with explicit configuration by passing the BlinkPayConfig:
- `JavaScript`
```javascript
const blinkPayConfig = {
    blinkpay: {
        debitUrl: process.env.BLINKPAY_DEBIT_URL || '',
        clientId: process.env.BLINKPAY_CLIENT_ID || '',
        clientSecret: process.env.BLINKPAY_CLIENT_SECRET || '',
        timeout: 10000,
        retryEnabled: true
    }
};
const client = new BlinkDebitClient(axios, blinkPayConfig);
```
- `TypeScript`
```typescript
const blinkPayConfig: BlinkPayConfig = {
    blinkpay: {
        debitUrl: process.env.BLINKPAY_DEBIT_URL || '',
        clientId: process.env.BLINKPAY_CLIENT_ID || '',
        clientSecret: process.env.BLINKPAY_CLIENT_SECRET || '',
        timeout: 10000,
        retryEnabled: true
    }
};
const client = new BlinkDebitClient(axios, blinkPayConfig);
```

or by providing the required parameters:

```javascript
const client = new BlinkDebitClient(axios, process.env.BLINKPAY_DEBIT_URL,
    process.env.BLINKPAY_CLIENT_ID, process.env.BLINKPAY_CLIENT_SECRET);
```

## Request ID, Correlation ID and Idempotency Key
An optional request ID, correlation ID and idempotency key can be added as arguments to API calls. They will be generated for you automatically if they are not provided.

A request can have one request ID and one idempotency key but multiple correlation IDs in case of retries.

## Full Examples
> **Note:** For error handling, a BlinkServiceException can be caught.
### Quick payment (one-off payment), using Gateway flow
A quick payment is a one-off payment that combines the API calls needed for both the consent and the payment.
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: 'https://www.blinkpay.co.nz/sample-merchant-return-page'
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: '0.01'
    },
    pcr: {
        particulars: 'particulars',
        code: 'code',
        reference: reference
    }
};

const qpCreateResponse = await client.createQuickPayment(request);
_logger.LogInformation("Redirect URL: {}", qpCreateResponseredirectUri); // Redirect the consumer to this URL
const qpId = qpCreateResponse.quickPaymentId;
const qpResponse = await client.awaitSuccessfulQuickPaymentOrThrowException(qpId, 300); // Will throw an exception if the payment was not successful after 5min
```

### Single consent followed by one-off payment, using Gateway flow
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Redirect,
            bank: Bank.BNZ,
            redirectUri: 'https://www.blinkpay.co.nz/sample-merchant-return-page'
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: '0.01'
    },
    pcr: {
        particulars: 'particulars'
    }
};

const createConsentResponse = await client.createSingleConsent(request);
const redirectUri = createConsentResponse.redirectUri; // Redirect the consumer to this URL
const paymentRequest = new PaymentRequest
{
    consentId = createConsentResponse.consentId
};

const paymentResponse = await client.createPayment(paymentRequest);
_logger.LogInformation("Payment Status: {}", await client.getPayment(paymentResponse.paymentId).status);
// TODO inspect the payment result status
```

## Individual API Call Examples
### Bank Metadata
Supplies the supported banks and supported flows on your account.
```typescript
const bankMetadataList = await client.getMeta();
```

### Quick Payments
#### Gateway Flow
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    }
};

const createQuickPaymentResponse = await client.createQuickPayment(request);
```
#### Gateway Flow - Redirect Flow Hint
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri,
            flowHint: {
                type: FlowHintTypeEnum.Redirect,
                bank: bank
            }
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    }
};

const createQuickPaymentResponse = await client.createQuickPayment(request);
```
#### Gateway Flow - Decoupled Flow Hint
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri,
            flowHint: {
                type: FlowHintTypeEnum.Decoupled,
                bank: bank,
                identifierType: identifierType,
                identifierValue: identifierValue
            }
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    }
};

const createQuickPaymentResponse = await client.createQuickPayment(request);
```
#### Redirect Flow
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Redirect,
            bank: bank,
            redirectUri: redirectUri
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    }
};

const createQuickPaymentResponse = await client.createQuickPayment(request);
```
#### Decoupled Flow
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Decoupled,
            bank: bank,
            identifierType: identifierType,
            identifierValue: identifierValue,
            callbackUrl: callbackUrl
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    }
};

const createQuickPaymentResponse = await client.createQuickPayment(request);
```
#### Retrieval
```typescript
const quickPaymentResponse = await client.getQuickPayment(quickPaymentId);
```
#### Revocation
```javascript
await client.revokeQuickPayment(quickPaymentId);
```

### Single/One-Off Consents
#### Gateway Flow
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    }
};

const createConsentResponse = await client.createSingleConsent(request);
```
#### Gateway Flow - Redirect Flow Hint
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri,
            flowHint: {
                type: FlowHintTypeEnum.Redirect,
                bank: Bank.PNZ
            }
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    }
};

const createConsentResponse = await client.createSingleConsent(request);
```
#### Gateway Flow - Decoupled Flow Hint
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri,
            flowHint: {
                type: FlowHintTypeEnum.Decoupled,
                bank: bank,
                identifierType: identifierType,
                identifierValue: identifierValue
            }
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    }
};

const createConsentResponse = await client.createSingleConsent(request);
```
#### Redirect Flow
Suitable for most consents.
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Redirect,
            bank: bank,
            redirectUri: redirectUri
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    }
};

const createConsentResponse = await client.createSingleConsent(request);
```
#### Decoupled Flow
This flow type allows better support for mobile by allowing the supply of a mobile number or previous consent ID to identify the customer with their bank.

The customer will receive the consent request directly to their online banking app. This flow does not send the user through a web redirect flow.

```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Decoupled,
            bank: bank,
            identifierType: identifierType,
            identifierValue: identifierValue,
            callbackUrl: callbackUrl
        }
    },
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    }
};

const createConsentResponse = await client.createSingleConsent(request);
```
#### Retrieval
Get the consent including its status
```typescript
const consent = await client.getSingleConsent(consentId);
```
#### Revocation
```typescript
await client.revokeSingleConsent(consentId);
```

### Blink AutoPay - Enduring/Recurring Consents
Request an ongoing authorisation from the customer to debit their account on a recurring basis.

Note that such an authorisation can be revoked by the customer in their mobile banking app.
#### Gateway Flow
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri
        }
    },
    maximumAmountPeriod: {
        currency: AmountCurrencyEnum.NZD,
        total: totalPerPeriod
    },
    maximumAmountPayment: {
        currency: AmountCurrencyEnum.NZD,
        total: totalPerPayment
    },
    fromTimestamp: startDate,
    expiryTimestamp: endDate,
    period: period
};

const createConsentResponse = await client.createEnduringConsent(request);
```
#### Gateway Flow - Redirect Flow Hint
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri,
            flowHint: {
                type: FlowHintTypeEnum.Redirect,
                bank: Bank.PNZ
            }
        }
    },
    maximumAmountPeriod: {
        currency: AmountCurrencyEnum.NZD,
        total: totalPerPeriod
    },
    maximumAmountPayment: {
        currency: AmountCurrencyEnum.NZD,
        total: totalPerPayment
    },
    fromTimestamp: startDate,
    expiryTimestamp: endDate,
    period: period
};

const createConsentResponse = await client.createEnduringConsent(request);
```
#### Gateway Flow - Decoupled Flow Hint
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri,
            flowHint: {
                type: FlowHintTypeEnum.Decoupled,
                bank: bank,
                identifierType: identifierType,
                identifierValue: identifierValue
            }
        }
    },
    maximumAmountPeriod: {
        currency: AmountCurrencyEnum.NZD,
        total: totalPerPeriod
    },
    maximumAmountPayment: {
        currency: AmountCurrencyEnum.NZD,
        total: totalPerPayment
    },
    fromTimestamp: startDate,
    expiryTimestamp: endDate,
    period: period
};

const createConsentResponse = await client.createEnduringConsent(request);
```
#### Redirect Flow
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Redirect,
            bank: bank,
            redirectUri: redirectUri
        }
    },
    maximumAmountPeriod: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    maximumAmountPayment: {
        currency: AmountCurrencyEnum.NZD,
        total: totalPerPayment
    },
    fromTimestamp: startDate,
    expiryTimestamp: endDate,
    period: period
};

const createConsentResponse = await client.createEnduringConsent(request);
```
#### Decoupled Flow
```javascript
const request = {
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Decoupled,
            bank: bank,
            identifierType: identifierType,
            identifierValue: identifierValue,
            callbackUrl: callbackUrl
        }
    },
    maximumAmountPeriod: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    },
    maximumAmountPayment: {
        currency: AmountCurrencyEnum.NZD,
        total: totalPerPayment
    },
    fromTimestamp: startDate,
    expiryTimestamp: endDate,
    period: period
};
    
const createConsentResponse = await client.createEnduringConsent(request);
```
#### Retrieval
```javascript
const consent = await client.getEnduringConsent(consentId);
```
#### Revocation
```javascript
await client.revokeEnduringConsent(consentId);
```

### Payments
The completion of a payment requires a consent to be in the Authorised status.
#### Single/One-Off
```javascript
const paymentRequest = {
    consentId: consentId
};

const paymentResponse = await client.createPayment(request);
```
#### Enduring/Recurring
If you already have an approved consent, you can run a Payment against that consent at the frequency as authorised in the consent.
```javascript
const paymentRequest = {
    consentId: consentId,
    amount: {
        total: total,
        currency: AmountCurrencyEnum.NZD
    },
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    }
};

const paymentResponse = await client.createPayment(request);
```
#### Retrieval
```javascript
const payment = await client.getPayment(paymentId);
```

### Refunds
#### Account Number Refund
```javascript
const refundRequest = {
    type: RefundDetailTypeEnum.AccountNumber,
    paymentId: paymentId
}

const refundResponse = await client.createRefund(request);
```
#### Full Refund (Not yet implemented)
```javascript
const refundRequest = {
    type: RefundDetailTypeEnum.FullRefund,
    paymentId: paymentId,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    },
    consentRedirect: redirectUri
}

const refundResponse = await client.createRefund(request);
```
#### Partial Refund (Not yet implemented)
```javascript
const refundRequest = {
    type: RefundDetailTypeEnum.PartialRefund,
    paymentId: paymentId,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    },
    consentRedirect: redirectUri,
    amount: {
        total: total,
        currency: AmountCurrencyEnum.NZD
    }
}

const refundResponse = await client.createRefund(request);
```
#### Retrieval
```javascript
const refund = await client.getRefund(refundId);
```