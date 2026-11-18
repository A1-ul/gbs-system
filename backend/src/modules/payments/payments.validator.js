'use strict';

const AppError = require('../../core/errors/AppError');
const { CHANNELS, GATEWAYS, PAYMENT_SCOPES } = require('./payments.constants');
const { normalizeGhanaPhone, roundMoney } = require('./payments.utils');

const FORBIDDEN_CREDENTIAL_KEYS = [
  'pin',
  'momopin',
  'momo_pin',
  'cardpin',
  'card_pin',
  'cvv',
  'cvc',
  'cardnumber',
  'card_number',
  'pan',
  'expiry',
  'expirydate'
];

function assertNoSensitivePaymentCredentials(payload) {
  if (!payload || typeof payload !== 'object') return;
  const inspect = (obj) => {
    for (const key of Object.keys(obj)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (FORBIDDEN_CREDENTIAL_KEYS.includes(normalized) && obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
        throw new AppError(
          'Security Policy Violation: GBS never accepts, collects, stores, or transmits Mobile Money PINs or raw card numbers/CVV/PINs. Complete authorization directly on your handset prompt or official provider checkout.',
          400
        );
      }
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        inspect(obj[key]);
      }
    }
  };
  inspect(payload);
}

function validateInitiatePayload(body = {}) {
  assertNoSensitivePaymentCredentials(body);

  const scope = String(body.paymentScope || PAYMENT_SCOPES.SCHOOL_FEES).toUpperCase();
  if (!PAYMENT_SCOPES[scope]) {
    throw new AppError('Invalid paymentScope. Allowed: SCHOOL_FEES or SUBSCRIPTION.', 400);
  }

  const channel = String(body.channel || '').toUpperCase();
  if (!CHANNELS[channel]) {
    throw new AppError('Invalid or unsupported payment method selected.', 400);
  }

  const gateway = body.gateway ? String(body.gateway).toUpperCase() : null;
  if (gateway && !GATEWAYS[gateway]) {
    throw new AppError(`Unsupported payment gateway: ${body.gateway}`, 400);
  }

  const amount = roundMoney(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Payment amount must be a positive number greater than 0.', 400);
  }

  const isMomoChannel = [CHANNELS.MTN_MOMO, CHANNELS.TELECEL_CASH, CHANNELS.AT_MONEY].includes(channel);
  let phoneResult = null;
  if (isMomoChannel) {
    phoneResult = normalizeGhanaPhone(body.payerPhone || body.phone);
    if (!phoneResult.valid) {
      throw new AppError(phoneResult.error, 400);
    }
  } else if (body.payerPhone || body.phone) {
    phoneResult = normalizeGhanaPhone(body.payerPhone || body.phone);
  }

  if (scope === PAYMENT_SCOPES.SCHOOL_FEES && !body.studentIdentifier && !body.studentId && !body.invoiceId) {
    throw new AppError('Student unique ID or invoice selection is required for school fee payments.', 400);
  }

  return {
    scope,
    channel,
    gateway,
    amount,
    currency: String(body.currency || 'GHS').toUpperCase(),
    phoneResult,
    isMomoChannel,
    preferHostedCheckout: Boolean(body.preferHostedCheckout),
    studentIdentifier: body.studentIdentifier || (body.studentId ? String(body.studentId) : null),
    invoiceId: body.invoiceId ? parseInt(body.invoiceId, 10) : null,
    payerEmail: body.payerEmail ? String(body.payerEmail).trim().toLowerCase() : null,
    payerName: body.payerName ? String(body.payerName).trim() : null,
    academicYear: body.academicYear ? String(body.academicYear).trim() : null,
    term: body.term ? String(body.term).trim() : null,
    idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey).trim() : null,
    returnUrl: body.returnUrl ? String(body.returnUrl).trim() : null
  };
}

module.exports = {
  assertNoSensitivePaymentCredentials,
  validateInitiatePayload
};
