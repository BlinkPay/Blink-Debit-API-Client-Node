# Blink-Debit-API-Client-TypeScript
[![CI](https://github.com/BlinkPay/Blink-Debit-API-Client-TypeScript/actions/workflows/build.yml/badge.svg)](https://github.com/BlinkPay/Blink-Debit-API-Client-TypeScript/actions/workflows/build.yml)
[![NPM](https://img.shields.io/npm/v/Blink-Debit-API-Client-TypeScript.svg)](https://npmjs.org/package/Blink-Debit-API-Client-TypeScript)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=blink-debit-api-client-typescript&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=blink-debit-api-client-typescript)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=blink-debit-api-client-typescript&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=blink-debit-api-client-typescript)
[![Snyk security](https://snyk.io/test/github/BlinkPay/Blink-Debit-API-Client-TypeScript/badge.svg)](https://snyk.io/test/github/BlinkPay/Blink-Debit-API-Client-TypeScript)

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
This SDK allows merchants with TypeScript- or JavaScript-based e-commerce site to integrate with Blink PayNow and Blink AutoPay.

This SDK was written in TypeScript 5.

## Contributing
We welcome contributions from the community. Your pull request will be reviewed by our team.

This project is licensed under the MIT License.

## Minimum Requirements
- TypeScript 5.1
- Axios 1.4
- Node.js 18.16 LTS (tested on 20.3)

## Adding the dependency
- Install via NPM
```shell
npm install blink-debit-api-client-typescript --save
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

```typescript
const client = new BlinkDebitClient();

const request: QuickPaymentRequest = {
    type: ConsentDetailTypeEnum.Single,
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

const qpCreateResponse = client.createQuickPayment(request);
_logger.LogInformation("Redirect URL: {}", qpCreateResponseredirectUri); // Redirect the consumer to this URL
const qpId = qpCreateResponse.quickPaymentId;
const qpResponse = client.awaitSuccessfulQuickPaymentOrThrowException(qpId, 300); // Will throw an exception if the payment was not successful after 5min
```

## Configuration
- Customise/supply the required properties in your `config.json` and `.env`. This file should be available in your project folder.
- The BlinkPay **Sandbox** debit URL is `https://sandbox.debit.blinkpay.co.nz` and the **production** debit URL is `https://debit.blinkpay.co.nz`.
- The client credentials will be provided to you by BlinkPay as part of your on-boarding process.
> **Warning** Take care not to check in your client ID and secret to your source control.

### Configuration precedence
Configuration will be detected and loaded according to the hierarchy -
1. `.env`
2. `config.json`
3. Default values

### Configuration examples

#### .env file
This file is NOT pushed to the repository.
```dotenv
BLINKPAY_DEBIT_URL=<BLINKPAY_DEBIT_URL>
BLINKPAY_CLIENT_ID=<BLINKPAY_CLIENT_ID>
BLINKPAY_CLIENT_SECRET=<BLINKPAY_CLIENT_SECRET>
BLINKPAY_TIMEOUT=10000
BLINKPAY_RETRY_ENABLED=true
```

### config.json file
Substitute the correct values in your `config.json` file. Since this file can be pushed to your repository, make sure that the client secret is not included.
```json
{
  "blinkpay": {
    "debitUrl": "https://sandbox.debit.blinkpay.co.nz",
    "timeout": 10000,
    "retryEnabled": true
  }
}
```

## Client creation
If you've configured the `.env` file locally or via CI/CD, you can just create the client with:
```typescript
const client = new BlinkDebitClient();
```

Another way is to pass the path to a JSON configuration file:
```typescript
const directory = '/path/to/config/directory';
const fileName = 'my-config.json'
const client = new BlinkDebitClient(directory, fileName);
```

## Request ID, Correlation ID and Idempotency Key
An optional request ID, correlation ID and idempotency key can be added as arguments to API calls. They will be generated for you automatically if they are not provided.

A request can have one request ID and one idempotency key but multiple correlation IDs in case of retries.

## Full Examples
> **Note:** For error handling, a BlinkServiceException can be caught.
### Quick payment (one-off payment), using Gateway flow
A quick payment is a one-off payment that combines the API calls needed for both the consent and the payment.
```typescript
const request: QuickPaymentRequest = {
    type: ConsentDetailTypeEnum.Single,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: 'https://www.blinkpay.co.nz/sample-merchant-return-page'
        } as GatewayFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: '0.01'
    } as Amount,
    pcr: {
        particulars: 'particulars',
        code: 'code',
        reference: reference
    } as Pcr
};

const qpCreateResponse = client.createQuickPayment(request);
_logger.LogInformation("Redirect URL: {}", qpCreateResponseredirectUri); // Redirect the consumer to this URL
const qpId = qpCreateResponse.quickPaymentId;
const qpResponse = client.awaitSuccessfulQuickPaymentOrThrowException(qpId, 300); // Will throw an exception if the payment was not successful after 5min
```

### Single consent followed by one-off payment, using Gateway flow
```typescript
const request: SingleConsentRequest = {
    type: ConsentDetailTypeEnum.Single,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Redirect,
            bank: Bank.BNZ,
            redirectUri: 'https://www.blinkpay.co.nz/sample-merchant-return-page'
        } as RedirectFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: '0.01'
    } as Amount,
    pcr: {
        particulars: 'particulars'
    } as Pcr
};

const createConsentResponse = client.createSingleConsent(consent);
const redirectUri = createConsentResponse.redirectUri; // Redirect the consumer to this URL
const paymentRequest = new PaymentRequest
{
    consentId = createConsentResponse.consentId
};

const paymentResponse = client.createPayment(paymentRequest);
_logger.LogInformation("Payment Status: {}", client.getPayment(paymentResponse.paymentId).status);
// TODO inspect the payment result status
```

## Individual API Call Examples
### Bank Metadata
Supplies the supported banks and supported flows on your account.
```typescript
const bankMetadataList = client.getMeta();
```

### Quick Payments
#### Gateway Flow
```typescript
const request: QuickPaymentRequest = {
    type: ConsentDetailTypeEnum.Single,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri
        } as GatewayFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr
};

const createQuickPaymentResponse = client.createQuickPayment(request);
```
#### Gateway Flow - Redirect Flow Hint
```typescript
const request: QuickPaymentRequest = {
    type: ConsentDetailTypeEnum.Single,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri,
            flowHint: {
                type: FlowHintTypeEnum.Redirect,
                bank: bank
            } as RedirectFlowHint
        } as GatewayFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr
};

const createQuickPaymentResponse = client.createQuickPayment(request);
```
#### Gateway Flow - Decoupled Flow Hint
```typescript
const request: QuickPaymentRequest = {
    type: ConsentDetailTypeEnum.Single,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri,
            flowHint: {
                type: FlowHintTypeEnum.Decoupled,
                bank: bank,
                identifierType: identifierType,
                identifierValue: identifierValue
            } as DecoupledFlowHint
        } as GatewayFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr
};

const createQuickPaymentResponse = client.createQuickPayment(request);
```
#### Redirect Flow
```typescript
const request: QuickPaymentRequest = {
    type: ConsentDetailTypeEnum.Single,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Redirect,
            bank: bank,
            redirectUri: redirectUri
        } as RedirectFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr
};

const createQuickPaymentResponse = client.createQuickPayment(request);
```
#### Decoupled Flow
```typescript
const request: QuickPaymentRequest = {
    type: ConsentDetailTypeEnum.Single,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Decoupled,
            bank: bank,
            identifierType: identifierType,
            identifierValue: identifierValue,
            callbackUrl: callbackUrl
        } as DecoupledFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr
};

const createQuickPaymentResponse = client.createQuickPayment(request);
```
#### Retrieval
```typescript
const quickPaymentResponse = client.getQuickPayment(quickPaymentId);
```
#### Revocation
```typescript
client.revokeQuickPayment(quickPaymentId);
```

### Single/One-Off Consents
#### Gateway Flow
```typescript
const request: SingleConsentRequest = {
    type: ConsentDetailTypeEnum.Single,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri
        } as GatewayFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr
};

const createConsentResponse = client.createSingleConsent(request);
```
#### Gateway Flow - Redirect Flow Hint
```typescript
const request: SingleConsentRequest = {
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
        total: total
    } as Amount,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr
};

const createConsentResponse = client.createSingleConsent(request);
```
#### Gateway Flow - Decoupled Flow Hint
```typescript
const request: SingleConsentRequest = {
    type: ConsentDetailTypeEnum.Single,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri,
            flowHint: {
                type: FlowHintTypeEnum.Decoupled,
                bank: bank,
                identifierType: identifierType,
                identifierValue: identifierValue
            } as DecoupledFlowHint
        } as GatewayFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr
};

const createConsentResponse = client.createSingleConsent(request);
```
#### Redirect Flow
Suitable for most consents.
```typescript
const request: SingleConsentRequest = {
    type: ConsentDetailTypeEnum.Single,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Redirect,
            bank: bank,
            redirectUri: redirectUri
        } as RedirectFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr
};

const createConsentResponse = client.createSingleConsent(request);
```
#### Decoupled Flow
This flow type allows better support for mobile by allowing the supply of a mobile number or previous consent ID to identify the customer with their bank.

The customer will receive the consent request directly to their online banking app. This flow does not send the user through a web redirect flow.

```typescript
const request: SingleConsentRequest = {
    type: ConsentDetailTypeEnum.Single,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Decoupled,
            bank: bank,
            identifierType: identifierType,
            identifierValue: identifierValue,
            callbackUrl: callbackUrl
        } as DecoupledFlow
    } as AuthFlow,
    amount: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr
};

const createConsentResponse = client.createSingleConsent(request);
```
#### Retrieval
Get the consent including its status
```typescript
const consent = client.getSingleConsent(consentId);
```
#### Revocation
```typescript
client.revokeSingleConsent(consentId);
```

### Blink AutoPay - Enduring/Recurring Consents
Request an ongoing authorisation from the customer to debit their account on a recurring basis.

Note that such an authorisation can be revoked by the customer in their mobile banking app.
#### Gateway Flow
```typescript
const request: EnduringConsentRequest = {
    type: ConsentDetailTypeEnum.Enduring,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri
        } as GatewayFlow
    } as AuthFlow,
    maximumAmountPeriod: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    fromTimestamp: startDate,
    expiryTimestamp: endDate,
    period: period
};

const createConsentResponse = client.createEnduringConsent(request);
```
#### Gateway Flow - Redirect Flow Hint
```typescript
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
        total: total
    } as Amount,
    fromTimestamp: startDate,
    expiryTimestamp: endDate,
    period: period
};

const createConsentResponse = client.createEnduringConsent(request);
```
#### Gateway Flow - Decoupled Flow Hint

```typescript
const request: EnduringConsentRequest = {
    type: ConsentDetailTypeEnum.Enduring,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Gateway,
            redirectUri: redirectUri,
            flowHint: {
                type: FlowHintTypeEnum.Decoupled,
                bank: bank,
                identifierType: identifierType,
                identifierValue: identifierValue
            } as DecoupledFlowHint
        } as GatewayFlow
    } as AuthFlow,
    maximumAmountPeriod: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    fromTimestamp: startDate,
    expiryTimestamp: endDate,
    period: period
};

const createConsentResponse = client.createEnduringConsent(request);
```
#### Redirect Flow
```typescript
const request: EnduringConsentRequest = {
    type: ConsentDetailTypeEnum.Enduring,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Redirect,
            bank: bank,
            redirectUri: redirectUri
        } as RedirectFlow
    } as AuthFlow,
    maximumAmountPeriod: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    fromTimestamp: startDate,
    expiryTimestamp: endDate,
    period: period
};

const createConsentResponse = client.createEnduringConsent(request);
```
#### Decoupled Flow
```typescript
const request: EnduringConsentRequest = {
    type: ConsentDetailTypeEnum.Enduring,
    flow: {
        detail: {
            type: AuthFlowDetailTypeEnum.Decoupled,
            bank: bank,
            identifierType: identifierType,
            identifierValue: identifierValue,
            callbackUrl: callbackUrl
        } as DecoupledFlow
    } as AuthFlow,
    maximumAmountPeriod: {
        currency: AmountCurrencyEnum.NZD,
        total: total
    } as Amount,
    fromTimestamp: startDate,
    expiryTimestamp: endDate,
    period: period
};
    
const createConsentResponse = client.createEnduringConsent(request);
```
#### Retrieval
```typescript
const consent = client.getEnduringConsent(consentId);
```
#### Revocation
```typescript
client.revokeEnduringConsent(consentId);
```

### Payments
The completion of a payment requires a consent to be in the Authorised status.
#### Single/One-Off
```typescript
const paymentRequest: PaymentRequest = {
    consentId: consentId
};

const paymentResponse = client.createPayment(request);
```
#### Enduring/Recurring
If you already have an approved consent, you can run a Payment against that consent at the frequency as authorised in the consent.
```typescript
const paymentRequest: PaymentRequest = {
    consentId: consentId,
    enduringPayment: {
        amount: {
            total: total,
            currency: AmountCurrencyEnum.NZD
        } as Amount,
        pcr: {
            particulars: particulars,
            code: code,
            reference: reference
        } as Pcr
    }
};

const paymentResponse = client.createPayment(request);
```
#### Westpac
Westpac requires you to specify which account of the customers to debit.

The available selection of accounts is supplied to you in the consent response of an Authorised Westpac consent object, and the ID of the selected account in supplied here.
```typescript
const paymentRequest: PaymentRequest = {
    consentId: consentId,
    accountReferenceId: accountReferenceId
};

const paymentResponse = client.createWestpacPayment(request);
```
#### Retrieval
```typescript
const payment = client.getPayment(paymentId);
```

### Refunds
#### Account Number Refund
```typescript
const refundRequest: AccountNumberRefundRequest = {
    type: RefundDetailTypeEnum.AccountNumber,
    paymentId: paymentId
}

const refundResponse = client.createRefund(request);
```
#### Full Refund (Not yet implemented)
```typescript
const refundRequest: FullRefundRequest = {
    type: RefundDetailTypeEnum.FullRefund,
    paymentId: paymentId,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr,
    consentRedirect: redirectUri
}

const refundResponse = client.createRefund(request);
```
#### Partial Refund (Not yet implemented)
```typescript
const refundRequest: PartialRefundRequest = {
    type: RefundDetailTypeEnum.PartialRefund,
    paymentId: paymentId,
    pcr: {
        particulars: particulars,
        code: code,
        reference: reference
    } as Pcr,
    consentRedirect: redirectUri,
    amount: {
        total: total,
        currency: AmountCurrencyEnum.NZD
    } as Amount
}

const refundResponse = client.createRefund(request);
```
#### Retrieval
```typescript
const refund = client.getRefund(refundId);
```