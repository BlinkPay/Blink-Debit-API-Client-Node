# BlinkPay SDK - Development Notes

This document provides context and guidance for AI assistants (like Claude) working on the BlinkPay Node.js SDK codebase.

## Project Overview

**BlinkPay SDK for Node.js** is a TypeScript SDK for integrating with the BlinkPay Debit payment API. It enables:
- **Blink PayNow**: One-off payments
- **Blink AutoPay**: Recurring payments

**Important**: This SDK is **server-side only**. It must never be used in browser/frontend JavaScript.

## Architecture

### Core Components

1. **BlinkDebitClient** (`src/client/v1/blink-debit-client.ts`)
   - Main client class users instantiate
   - Provides high-level methods for all API operations
   - Has 5 constructor overloads for flexibility
   - Wraps all errors in BlinkServiceException

2. **Configuration** (`configuration.ts`)
   - Handles environment variables and config files
   - Manages OAuth2 credentials
   - Stores singleton TokenAPI instance (optimized)
   - Configures Axios, retry policy, and error handling
   - **Critical**: Detects browser environment and throws error

3. **TokenAPI** (`src/client/v1/token-api.ts`)
   - Manages OAuth2 Client Credentials flow
   - Automatically refreshes expired tokens
   - Stored as singleton in Configuration (v1.3.2+)
   - Token expiration tracked via `expirationDate`

4. **API Clients** (`src/client/v1/*-api.ts`)
   - Individual API endpoint implementations
   - Auto-generated base with manual enhancements
   - Use Configuration.tokenApi for authentication
   - Support retry policies and custom headers

5. **DTOs** (`src/dto/v1/*.ts`)
   - Data Transfer Objects
   - **Mostly auto-generated** - be careful when modifying
   - Follow OpenAPI 3.0.3 spec exactly

### Key Design Decisions

#### Singleton Removal (v1.3.1)
- **Before**: Configuration and TokenAPI used singleton pattern
- **After**: Instances created per client, enabling multiple concurrent clients
- **Benefit**: Better testability, no global state issues

#### TokenAPI Optimization (v1.3.2)
- **Before**: New TokenAPI instance created for every API call (14+ per request)
- **After**: Single TokenAPI instance stored in Configuration
- **Benefit**: Reduced object creation overhead, cleaner code

#### Environment Variables
- **Prefix**: `BLINKPAY_*` (not `REACT_APP_*`)
- **Required**: BLINKPAY_DEBIT_URL, BLINKPAY_CLIENT_ID, BLINKPAY_CLIENT_SECRET
- **Optional**: BLINKPAY_TIMEOUT, BLINKPAY_RETRY_ENABLED

#### Error Handling
- All errors wrapped in `BlinkServiceException` or specific subclasses
- Helper method `handleError()` reduces duplication (v1.3.2+)
- Errors properly propagated (token refresh no longer silently fails)

## Recent Changes & Fixes

### Session 1: Initial Code Review & Fixes (Commit: d27a2fc)
- Fixed critical constructor bug using wrong env vars
- Removed all REACT_APP_ prefixes → BLINKPAY_*
- Removed singleton patterns from Configuration and TokenAPI
- Fixed token refresh interceptor leak
- Added retry policy null checks
- Fixed error handling (HTTP 422, error body access)
- Removed console.log statements
- Made cardNetwork optional
- Updated README (removed 280+ lines of React/browser docs)
- Added security warning

### Session 2: Minor Issues (Commit: 52356f2)
- Added missing 4-arg constructor overload
- Fixed timeout validation logic
- Optimized TokenAPI instantiation (singleton in Configuration)
- Updated README wording ("browser environment" → "with explicit configuration")

### Session 3: Critical Fixes & Recommendations (Current)

**Critical Fixes:**
1. **Token Refresh Error Handling** (`token-api.ts:72`)
   - **Issue**: Errors caught but not rethrown, causing silent failures
   - **Fix**: Now rethrows errors to propagate authentication failures
   - **Impact**: Better error visibility and debugging

2. **Uninitialized expirationDate** (`configuration.ts:223`)
   - **Issue**: Field declared but never initialized
   - **Fix**: Initialize to `new Date(0)` to force initial token refresh
   - **Impact**: Prevents undefined comparison errors

3. **Error Handling Logic** (`blink-debit-client.ts:756, 855`)
   - **Issue**: Incorrect instanceof check threw wrong error
   - **Before**: `if (error instanceof BlinkConsentFailureException || error.innerException instanceof BlinkServiceException)`
   - **After**: `if (error.innerException instanceof BlinkConsentFailureException || error.innerException instanceof BlinkServiceException)`
   - **Impact**: Correct error propagation

4. **Missing idempotencyKey** (`quick-payments-api.ts:64`)
   - **Issue**: Extracted from params but not passed to buildRequestHeaders
   - **Fix**: Added idempotencyKey to buildRequestHeaders call
   - **Impact**: Idempotency protection now works correctly for quick payments

**Optional Improvements:**
- Added `handleError()` helper method to reduce duplication
- Added comprehensive JSDoc to TokenAPI.getAccessToken()
- Demonstrated error handling refactoring pattern

## Testing

### Integration Tests
Location: `integrationTest/client/v1/*.test.ts`

**Coverage:**
- ✅ Bank metadata retrieval
- ✅ Single consents (redirect & decoupled flows)
- ✅ Enduring consents
- ✅ Quick payments
- ✅ Payments
- ✅ Refunds
- ✅ Error handling (timeouts, 404s, etc.)

**Running Tests:**
```bash
npm test
```

**Requirements:**
- Valid .env file with BLINKPAY_* credentials
- Access to BlinkPay sandbox environment
- Tests use live API (not mocked)

**Note**: Tests require valid BlinkPay sandbox credentials. The 403 "Access denied" error indicates invalid/expired credentials, not code issues.

### Manual Testing
When making changes, verify:
1. TypeScript compilation: `npm run build`
2. Environment variable loading
3. Constructor overloads work correctly
4. Error handling propagates correctly
5. Integration tests pass (with valid creds)

## Common Pitfalls

### ❌ DON'T
- Use this SDK in browser/frontend code
- Use REACT_APP_ environment variable prefix
- Modify DTOs without checking OpenAPI spec
- Add console.log statements (use loglevel)
- Create singleton patterns
- Catch errors without rethrowing (unless intentional)
- Use `any` type without good reason

### ✅ DO
- Keep SDK server-side only
- Use BLINKPAY_ environment variable prefix
- Follow OpenAPI spec for DTOs
- Use loglevel for logging
- Create instances (not singletons)
- Propagate errors properly
- Use proper TypeScript types

## Code Review Checklist

When reviewing or making changes:

### Security
- [ ] No credentials exposed in code
- [ ] Browser environment check in place
- [ ] Proper error message sanitization
- [ ] No sensitive data in logs

### Architecture
- [ ] No circular dependencies
- [ ] Proper separation of concerns
- [ ] No global state/singletons
- [ ] Follows existing patterns

### Error Handling
- [ ] Errors properly typed
- [ ] Errors propagated correctly
- [ ] No silent failures
- [ ] Helpful error messages

### Testing
- [ ] Integration tests still pass
- [ ] New features have tests
- [ ] Edge cases covered
- [ ] Error paths tested

### Documentation
- [ ] JSDoc for public methods
- [ ] README updated if needed
- [ ] Comments explain "why" not "what"
- [ ] CHANGELOG updated

## Known Issues & Technical Debt

### High Priority
None currently.

### Medium Priority
1. **Type Safety**: Some uses of `any` type could be more specific
   - `configuration.ts:71` - baseOptions
   - `configuration.ts:338` - headers parameter
   - All API files - localVarQueryParameter

2. **Error Handling**: Remaining duplicated error handling blocks
   - Many methods in blink-debit-client.ts still have duplicated catch blocks
   - Pattern established with `handleError()` method
   - Could be refactored to use helper in remaining methods

3. **Constructor Overloads**: Complex implementation
   - BlinkDebitClient has 5 overloads with nested conditionals
   - Works correctly but could be cleaner
   - Consider builder pattern for future v2

### Low Priority
1. **Token Refresh Race Condition**: Multiple concurrent calls might trigger multiple refreshes
   - Not critical as OAuth2 server handles it
   - Could add semaphore/lock for cleaner implementation

2. **Hardcoded Dummy URL**: All API files use `'https://example.com'` as dummy base
   - Functional but confusing
   - Could use constant with explanatory comment

3. **Missing JSDoc**: Some public methods lack documentation
   - Most critical ones now documented
   - Could document remaining methods for consistency

## Environment Setup

### Required Tools
- Node.js 22.10 LTS
- TypeScript 5.9+
- npm (for dependencies)

### Development Workflow
```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests (requires valid credentials)
npm test

# Type check
npx tsc --noEmit
```

### Configuration Files
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Test configuration
- `.env` - Environment variables (git-ignored)
- `package.json` - Dependencies and scripts

## API Specification

**OpenAPI Spec Version**: 1.0.19
**Base URL**:
- Sandbox: `https://sandbox.debit.blinkpay.co.nz`
- Production: `https://debit.blinkpay.co.nz`

**Authentication**: OAuth2 Client Credentials flow

**Key Endpoints**:
- `/oauth2/token` - Token endpoint
- `/payments/v1/meta` - Bank metadata
- `/payments/v1/consents` - Consents (single/enduring)
- `/payments/v1/quick-payments` - Quick payments
- `/payments/v1/payments` - Payments
- `/payments/v1/refunds` - Refunds

## Useful Commands

```bash
# Search for specific error handling pattern
grep -r "BlinkServiceException" src/

# Find all error catches
grep -r "catch(error" src/

# Check for console.log (should be none)
grep -r "console.log" src/

# Find TODO/FIXME comments
grep -r "TODO\|FIXME" src/

# Check TypeScript strict mode
grep "strict" tsconfig.json

# List all API files
ls -la src/client/v1/*-api.ts
```

## Contact & Resources

- **Repository**: https://github.com/BlinkPay/Blink-Debit-API-Client-Node
- **BlinkPay Docs**: (Contact BlinkPay for documentation)
- **OpenAPI Spec**: Provided separately by BlinkPay
- **Support**: sysadmin@blinkpay.co.nz

## Version History

- **v1.3.2** (Current): Critical fixes and optimizations
- **v1.3.1**: Second code review fixes
- **v1.3.0**: Major refactoring - removed singletons, fixed critical bugs
- **v1.2.x**: Previous stable version
- **v1.0.19**: API spec version match

---

**Last Updated**: 2025-11-06
**Maintained By**: BlinkPay Team
**AI Assistant Guidelines Version**: 1.0
