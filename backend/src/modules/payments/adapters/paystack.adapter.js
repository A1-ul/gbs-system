'use strict';

const crypto = require('crypto');
const BasePaymentAdapter = require('./base.adapter');
const { CHANNELS, GATEWAYS, TRANSACTION_STATES } = require('../payments.constants');
const { timingSafeEqualsHex, roundMoney } = require('../payments.utils');
const AppError = require('../../../core/errors/AppError');

const PAYSTACK_MOMO_PROVIDER_MAP = Object.freeze({
  [CHANNELS.MTN_MOMO]: 'mtn',
  [CHANNELS.TELECEL_CASH]: 'vod',
  [CHANNELS.AT_MONEY]: 'tgo'
});

class PaystackAdapter extends BasePaymentAdapter {
  constructor(options = {}) {
    super(GATEWAYS.PAYSTACK);
    this.baseUrl = options.baseUrl || process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
    this.fetchFn = options.fetchImpl || global.fetch;
  }

  _getSecretKey(config = {}) {
    if (config && config.secretKey) return config.secretKey;
    return process.env.PAYSTACK_SECRET_KEY || '';
  }

  isConfigured(config = {}) {
    return Boolean(this._getSecretKey(config));
  }

  getSupportedChannels(config = {}) {
    const channels = [];
    if (config.supportsMtnMomo !== false) channels.push(CHANNELS.MTN_MOMO);
    if (config.supportsTelecelCash !== false) channels.push(CHANNELS.TELECEL_CASH);
    if (config.supportsAtMoney !== false) channels.push(CHANNELS.AT_MONEY);
    if (config.supportsVisa !== false) channels.push(CHANNELS.VISA);
    if (config.supportsMastercard !== false) channels.push(CHANNELS.MASTERCARD);
    if (config.supportsBankTransfer !== false) channels.push(CHANNELS.BANK_TRANSFER);
    return channels;
  }

  getCapabilitySummary(config = {}) {
    return {
      gateway: this.gatewayName,
      configured: this.isConfigured(config),
      supportedChannels: this.getSupportedChannels(config),
      supportsDirectMomoPrompt: true,
      supportsHostedCheckout: true,
      supportsUssdFallback: true,
      supportsOtpStep: true,
      supportsSubaccounts: true
    };
  }

  async _request(method, endpoint, body, config = {}) {
    const secretKey = this._getSecretKey(config);
    if (!secretKey) {
      throw new AppError(
        'Paystack API secret key (PAYSTACK_SECRET_KEY) is not configured on the server. Configure Paystack credentials or select another configured gateway.',
        503
      );
    }
    if (typeof this.fetchFn !== 'function') {
      throw new AppError('HTTP fetch client unavailable for Paystack API communication.', 500);
    }

    const res = await this.fetchFn(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === false) {
      const msg = json.message || `Paystack API responded with HTTP ${res.status}`;
      throw new AppError(`Paystack gateway error: ${msg}`, res.status >= 400 && res.status < 500 ? 400 : 502);
    }
    return json;
  }

  async initiatePayment({
    reference,
    amount,
    currency = 'GHS',
    channel,
    payerEmail,
    phoneResult,
    subaccountCode,
    returnUrl,
    preferHostedCheckout = false,
    metadata = {},
    config = {}
  }) {
    const amountMinor = Math.round(roundMoney(amount) * 100);
    const email = payerEmail || 'finance@gbs-school.edu';

    // Cards, bank transfer, or explicit hosted-checkout fallback go through Paystack Standard Checkout
    const useHosted =
      preferHostedCheckout ||
      [CHANNELS.VISA, CHANNELS.MASTERCARD, CHANNELS.BANK_TRANSFER].includes(channel);

    if (useHosted) {
      const channelsFilter =
        channel === CHANNELS.VISA || channel === CHANNELS.MASTERCARD
          ? ['card']
          : channel === CHANNELS.BANK_TRANSFER
            ? ['bank', 'bank_transfer']
            : ['mobile_money', 'card', 'bank'];

      const payload = {
        email,
        amount: amountMinor,
        currency,
        reference,
        channels: channelsFilter,
        metadata: {
          ...metadata,
          gbsChannel: channel
        }
      };
      if (returnUrl) payload.callback_url = returnUrl;
      if (subaccountCode) payload.subaccount = subaccountCode;

      const response = await this._request('POST', '/transaction/initialize', payload, config);
      const data = response.data || {};
      return {
        status: TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
        providerReference: data.access_code || data.reference || reference,
        authorizationType: 'REDIRECT',
        authorizationUrl: data.authorization_url || null,
        ussdInstruction: null,
        displayMessage:
          'Continue to Paystack Secure Checkout to complete your payment. Return to GBS afterward for automatic verification.',
        rawResponse: data
      };
    }

    // Direct Mobile Money Charge (/charge) for MTN MoMo, Telecel Cash, or AT Money
    const momoProvider = PAYSTACK_MOMO_PROVIDER_MAP[channel];
    if (!momoProvider) {
      throw new AppError(`Paystack does not support direct charge for channel ${channel}.`, 400);
    }
    if (!phoneResult || !phoneResult.local) {
      throw new AppError('Valid Ghana mobile money phone number is required.', 400);
    }

    const chargePayload = {
      email,
      amount: amountMinor,
      currency,
      reference,
      mobile_money: {
        phone: phoneResult.local,
        provider: momoProvider
      },
      metadata: {
        ...metadata,
        gbsChannel: channel
      }
    };
    if (subaccountCode) chargePayload.subaccount = subaccountCode;

    const chargeRes = await this._request('POST', '/charge', chargePayload, config);
    const data = chargeRes.data || {};
    return this._interpretChargeResponse(data, reference);
  }

  _interpretChargeResponse(data = {}, reference) {
    const pStatus = String(data.status || '').toLowerCase();
    const displayText = data.display_text || data.message || null;

    if (pStatus === 'send_otp') {
      return {
        status: TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
        providerReference: data.reference || reference,
        authorizationType: 'OTP',
        authorizationUrl: null,
        ussdInstruction: null,
        displayMessage: displayText || 'Enter the verification code sent to your Mobile Money phone.',
        rawResponse: data
      };
    }

    if (pStatus === 'pay_offline' || pStatus === 'pending') {
      return {
        status: TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
        providerReference: data.reference || reference,
        authorizationType: 'PHONE_PROMPT',
        authorizationUrl: null,
        ussdInstruction: displayText || null,
        displayMessage:
          displayText ||
          'Check your phone for the Mobile Money approval prompt and enter your PIN on your handset. Do NOT enter your PIN inside GBS.',
        rawResponse: data
      };
    }

    if (pStatus === 'open_url' && data.url) {
      return {
        status: TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
        providerReference: data.reference || reference,
        authorizationType: 'REDIRECT',
        authorizationUrl: data.url,
        ussdInstruction: null,
        displayMessage: displayText || 'Open the provider verification link to authorize your payment.',
        rawResponse: data
      };
    }

    if (pStatus === 'success') {
      // Never mark SUCCESSFUL on initial /charge response alone — verify server-to-server first
      return {
        status: TRANSACTION_STATES.PROCESSING,
        providerReference: data.id ? String(data.id) : (data.reference || reference),
        authorizationType: 'NONE',
        authorizationUrl: null,
        ussdInstruction: null,
        displayMessage: 'Payment authorization received. Confirming settlement with Paystack...',
        shouldVerifyImmediately: true,
        rawResponse: data
      };
    }

    if (pStatus === 'failed') {
      return {
        status: TRANSACTION_STATES.FAILED,
        providerReference: data.reference || reference,
        authorizationType: 'NONE',
        authorizationUrl: null,
        ussdInstruction: null,
        displayMessage: data.gateway_response || displayText || 'Mobile Money charge was declined by the provider.',
        rawResponse: data
      };
    }

    return {
      status: TRANSACTION_STATES.PROCESSING,
      providerReference: data.reference || reference,
      authorizationType: 'PHONE_PROMPT',
      authorizationUrl: null,
      ussdInstruction: displayText || null,
      displayMessage: displayText || 'Awaiting Mobile Money approval from your network provider.',
      rawResponse: data
    };
  }

  async submitAuthorizationStep({ reference, otp, config = {} }) {
    if (!otp || !String(otp).trim()) {
      throw new AppError('One-time verification code (OTP) from your phone is required.', 400);
    }
    const res = await this._request(
      'POST',
      '/charge/submit_otp',
      { otp: String(otp).trim(), reference },
      config
    );
    return this._interpretChargeResponse(res.data || {}, reference);
  }

  async verifyTransaction({ reference, config = {} }) {
    const res = await this._request('GET', `/transaction/verify/${encodeURIComponent(reference)}`, null, config);
    const data = res.data || {};
    const status = this.mapProviderStatus(data.status);
    const verifiedAmount = data.amount !== undefined ? roundMoney(Number(data.amount) / 100) : null;

    return {
      verified: status === TRANSACTION_STATES.SUCCESSFUL,
      status,
      reference: data.reference || reference,
      providerReference: data.id ? String(data.id) : (data.reference || reference),
      amount: verifiedAmount,
      currency: String(data.currency || 'GHS').toUpperCase(),
      channel: data.channel ? String(data.channel).toUpperCase() : null,
      paidAt: data.paid_at || data.transaction_date || null,
      gatewayResponse: data.gateway_response || data.status || 'Verified with Paystack',
      rawResponse: data
    };
  }

  mapProviderStatus(providerStatus) {
    const s = String(providerStatus || '').toLowerCase();
    if (s === 'success') return TRANSACTION_STATES.SUCCESSFUL;
    if (s === 'abandoned') return TRANSACTION_STATES.CANCELLED;
    if (s === 'failed') return TRANSACTION_STATES.FAILED;
    if (s === 'reversed') return TRANSACTION_STATES.REVERSED;
    if (s === 'ongoing' || s === 'pending' || s === 'processing' || s === 'queued') {
      return TRANSACTION_STATES.PROCESSING;
    }
    return TRANSACTION_STATES.UNDER_REVIEW;
  }

  verifyWebhookSignature({ rawBody, headers = {}, config = {} }) {
    const secretKey = this._getSecretKey(config);
    if (!secretKey) return false;
    const signature = headers['x-paystack-signature'] || headers['X-Paystack-Signature'];
    if (!signature) return false;
    const payloadString = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8');
    const expectedHmac = crypto.createHmac('sha512', secretKey).update(payloadString).digest('hex');
    return timingSafeEqualsHex(expectedHmac, String(signature).toLowerCase());
  }

  parseWebhookEvent({ payload = {} }) {
    const event = String(payload.event || '').toLowerCase();
    const data = payload.data || {};
    const reference = data.reference || null;
    const providerReference = data.id ? String(data.id) : reference;
    const amount = data.amount !== undefined ? roundMoney(Number(data.amount) / 100) : null;
    const currency = String(data.currency || 'GHS').toUpperCase();

    let mappedStatus = TRANSACTION_STATES.UNDER_REVIEW;
    if (event === 'charge.success') mappedStatus = TRANSACTION_STATES.SUCCESSFUL;
    else if (event === 'charge.failed') mappedStatus = TRANSACTION_STATES.FAILED;
    else if (event === 'refund.processed') mappedStatus = TRANSACTION_STATES.REFUNDED;
    else if (event === 'charge.dispute.create' || event === 'transfer.reversed') {
      mappedStatus = TRANSACTION_STATES.REVERSED;
    }

    return {
      eventId: data.id ? `ps_${event}_${data.id}` : null,
      eventType: event || 'unknown',
      reference,
      providerReference,
      amount,
      currency,
      mappedStatus,
      raw: data
    };
  }
}

module.exports = PaystackAdapter;
