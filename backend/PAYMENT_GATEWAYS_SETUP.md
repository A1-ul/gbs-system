# GBS Multi-Gateway School Fees & Subscription Payment Setup

All payment secrets MUST reside exclusively in server environment variables (`backend/.env` or Render Environment Settings). Never commit real secret keys to GitHub or expose them in frontend code.

## 1. Required & Optional Environment Variables (`backend`)

### Paystack (Ghana MTN MoMo, Telecel Cash, AT Money, Visa, Mastercard, Bank Transfer)
- `PAYSTACK_SECRET_KEY`: Live (`sk_live_...`) or Test (`sk_test_...`) secret key. Used server-side for `/charge`, `/charge/submit_otp`, `/transaction/initialize`, `/transaction/verify/:reference`, and HMAC-SHA512 webhook signature validation (`x-paystack-signature`).
- `PAYSTACK_PUBLIC_KEY`: Optional public key preview (`pk_live_...` / `pk_test_...`).
- `PAYSTACK_DEFAULT_SUBACCOUNT`: Optional fallback subaccount code. Each school can also specify its own Paystack Subaccount Code (`ACCT_...`) inside **Accountant -> Payment Gateways** or **Developer -> Payment Gateways** so funds settle directly to that institution.
- `PAYSTACK_PLATFORM_SUBACCOUNT`: Optional subaccount for Developer platform subscription/renewal payments (`PaymentScope: SUBSCRIPTION`).
- Paystack Webhook URL: `https://<your-backend-domain>/api/v1/payments/webhooks/paystack`

### Hubtel (Ghana Online Checkout — MoMo & Cards)
- `HUBTEL_CLIENT_ID`: Hubtel API ID for Basic Auth.
- `HUBTEL_CLIENT_SECRET`: Hubtel API Key / Secret.
- `HUBTEL_MERCHANT_ACCOUNT_NUMBER`: Default POS Sales / Merchant Account Number (each school can configure its own `hubtelMerchantAccount` in Gateway Config).
- `HUBTEL_WEBHOOK_SECRET`: Optional HMAC-SHA256 webhook verification key (`x-hubtel-signature`). When omitted, incoming callbacks ALWAYS trigger mandatory server-to-server Status Check API verification before updating student balances.
- `HUBTEL_MODE`: `TEST` or `LIVE`.
- Hubtel Callback URL: `https://<your-backend-domain>/api/v1/payments/webhooks/hubtel`

### Official Institutional Bank Transfer
- Configurable per school via **Accountant / Developer -> Payment Gateways -> BANK_DIRECT** (`bankName`, `bankAccountNumber`, `bankAccountName`, `bankBranch`), or via optional defaults:
  - `SCHOOL_DEFAULT_BANK_NAME`
  - `SCHOOL_DEFAULT_BANK_ACCOUNT`
  - `SCHOOL_DEFAULT_BANK_ACCOUNT_NAME`
  - `SCHOOL_DEFAULT_BANK_BRANCH`

### Sandbox Test Mode (`SANDBOX_PSP`)
- Enabled automatically ONLY when gateway `mode !== 'LIVE'` for Demo Sandbox & QA testing (`SANDBOX_PAYMENT_WEBHOOK_SECRET` optional).
- Never available in `LIVE` mode and never accepts real money.

## 2. Transaction Lifecycle States

`CREATED`, `PENDING`, `REQUIRES_CUSTOMER_ACTION`, `PROCESSING`, `SUCCESSFUL`, `FAILED`, `CANCELLED`, `EXPIRED`, `REVERSED`, `REFUNDED`, `UNDER_REVIEW`.

Balances and official receipts (`payment_receipts` + `student_invoices`) are updated atomically **only** inside a database transaction (`accountingPosted` idempotency guard) after server-to-server verification or cryptographic webhook verification.
