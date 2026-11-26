'use strict';

const TRANSACTION_STATES = Object.freeze({
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  REQUIRES_CUSTOMER_ACTION: 'REQUIRES_CUSTOMER_ACTION',
  PROCESSING: 'PROCESSING',
  SUCCESSFUL: 'SUCCESSFUL',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REVERSED: 'REVERSED',
  REFUNDED: 'REFUNDED',
  UNDER_REVIEW: 'UNDER_REVIEW'
});

const STATE_CUSTOMER_MESSAGES = Object.freeze({
  CREATED: 'Payment request created. Starting checkout with your selected provider...',
  PENDING: 'Waiting to start authorization with your payment provider.',
  REQUIRES_CUSTOMER_ACTION: 'Please complete payment approval on your phone or checkout page.',
  PROCESSING: 'Your payment is being confirmed by the provider. Please wait a moment.',
  SUCCESSFUL: 'Payment confirmed! Your official receipt has been issued and fee balance updated.',
  FAILED: 'This payment could not be completed. No fee balance was changed. You can try again or choose another method.',
  CANCELLED: 'Payment cancelled. You can choose another payment method at any time.',
  EXPIRED: 'This payment session timed out before approval was completed. Please start a fresh payment.',
  REVERSED: 'This transaction was reversed by the payment provider and has been flagged in school accounts.',
  REFUNDED: 'This payment has been refunded and adjusted in the school fee ledger.',
  UNDER_REVIEW: 'Payment is under verification review by the school finance office or payment provider.'
});

const TERMINAL_STATES = new Set([
  TRANSACTION_STATES.FAILED,
  TRANSACTION_STATES.CANCELLED,
  TRANSACTION_STATES.EXPIRED
]);

const SETTLED_STATES = new Set([
  TRANSACTION_STATES.SUCCESSFUL,
  TRANSACTION_STATES.REFUNDED,
  TRANSACTION_STATES.REVERSED
]);

const GATEWAYS = Object.freeze({
  PAYSTACK: 'PAYSTACK',
  HUBTEL: 'HUBTEL',
  BANK_DIRECT: 'BANK_DIRECT',
  SANDBOX_PSP: 'SANDBOX_PSP'
});

const CHANNELS = Object.freeze({
  MTN_MOMO: 'MTN_MOMO',
  TELECEL_CASH: 'TELECEL_CASH',
  AT_MONEY: 'AT_MONEY',
  VISA: 'VISA',
  MASTERCARD: 'MASTERCARD',
  BANK_TRANSFER: 'BANK_TRANSFER'
});

const CHANNEL_LABELS = Object.freeze({
  MTN_MOMO: 'MTN Mobile Money',
  TELECEL_CASH: 'Telecel Cash',
  AT_MONEY: 'AT Money (AirtelTigo)',
  VISA: 'Visa Card',
  MASTERCARD: 'Mastercard',
  BANK_TRANSFER: 'Bank Transfer / Deposit'
});

const PAYMENT_SCOPES = Object.freeze({
  SCHOOL_FEES: 'SCHOOL_FEES',
  SUBSCRIPTION: 'SUBSCRIPTION'
});

const DEVELOPER_PAYMENT_DESTINATION = Object.freeze({
  momoNumber: process.env.DEVELOPER_MOMO_NUMBER || '0554594193',
  primaryNetwork: 'MTN Mobile Money',
  accountName: process.env.DEVELOPER_MOMO_NAME || 'GBS Platform Developer Collection',
  supportedNetworks: ['MTN_MOMO', 'TELECEL_CASH', 'AT_MONEY', 'BANK_TRANSFER'],
  bankName: process.env.DEVELOPER_BANK_NAME || null,
  bankAccountNumber: process.env.DEVELOPER_BANK_ACCOUNT || null,
  bankAccountName: process.env.DEVELOPER_BANK_ACCOUNT_NAME || null,
  bankBranch: process.env.DEVELOPER_BANK_BRANCH || null,
  requiresMerchantOwnershipVerification: true,
  securityNotice: 'Payments are routed through authorized merchant collection APIs (Paystack/Hubtel). GBS never requests, collects, or stores any MoMo PIN or banking password.'
});

/**
 * Valid status transition rules preventing premature or backward settlement flips.
 */
const ALLOWED_TRANSITIONS = Object.freeze({
  CREATED: new Set(['PENDING', 'REQUIRES_CUSTOMER_ACTION', 'PROCESSING', 'FAILED', 'CANCELLED', 'EXPIRED', 'UNDER_REVIEW']),
  PENDING: new Set(['PENDING', 'REQUIRES_CUSTOMER_ACTION', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'EXPIRED', 'UNDER_REVIEW']),
  REQUIRES_CUSTOMER_ACTION: new Set(['REQUIRES_CUSTOMER_ACTION', 'PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'EXPIRED', 'UNDER_REVIEW']),
  PROCESSING: new Set(['PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'EXPIRED', 'UNDER_REVIEW']),
  UNDER_REVIEW: new Set(['UNDER_REVIEW', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'REVERSED', 'REFUNDED']),
  SUCCESSFUL: new Set(['SUCCESSFUL', 'REFUNDED', 'REVERSED', 'UNDER_REVIEW']),
  FAILED: new Set(['FAILED', 'UNDER_REVIEW', 'SUCCESSFUL']), // only if server-to-server verification proves delayed capture
  CANCELLED: new Set(['CANCELLED', 'UNDER_REVIEW']),
  EXPIRED: new Set(['EXPIRED', 'UNDER_REVIEW', 'SUCCESSFUL']), // late webhook verified server-to-server
  REVERSED: new Set(['REVERSED']),
  REFUNDED: new Set(['REFUNDED'])
});

function canTransitionStatus(fromStatus, toStatus) {
  const from = String(fromStatus || 'CREATED').toUpperCase();
  const to = String(toStatus || '').toUpperCase();
  if (!TRANSACTION_STATES[to]) return false;
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.has(to) : false;
}

module.exports = {
  TRANSACTION_STATES,
  STATE_CUSTOMER_MESSAGES,
  TERMINAL_STATES,
  SETTLED_STATES,
  GATEWAYS,
  CHANNELS,
  CHANNEL_LABELS,
  PAYMENT_SCOPES,
  DEVELOPER_PAYMENT_DESTINATION,
  canTransitionStatus
};
