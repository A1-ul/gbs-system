'use strict';

const crypto = require('crypto');
const BasePaymentAdapter = require('./base.adapter');
const { CHANNELS, GATEWAYS, TRANSACTION_STATES } = require('../payments.constants');
const { timingSafeEqualsHex, roundMoney } = require('../payments.utils');
const AppError = require('../../../core/errors/AppError');

class HubtelAdapter extends BasePaymentAdapter {
  constructor(options = {}) {
    super(GATEWAYS.HUBTEL);
    this.checkoutBaseUrl = options.checkoutBaseUrl || process.env.HUBTEL_CHECKOUT_BASE_URL || 'https://payproxyapi.hubtel.com';
    this.statusBaseUrl = options.statusBaseUrl || process.env.HUBTEL_STATUS_BASE_URL || 'https://api-txnstatus.hubtel.com';
    this.fetchFn = options.fetchImpl || global.fetch;
  }

  _getCredentials(config = {}) {
    const clientId = config.clientId || process.env.HUBTEL_CLIENT_ID || '';
    const clientSecret = config.clientSecret || process.env.HUBTEL_CLIENT_SECRET || '';
    const merchantAccountNumber =
      config.hubtelMerchantAccount || config.merchantAccountNumber || process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || '';
    const webhookSecret = config.webhookSecret || process.env.HUBTEL_WEBHOOK_SECRET || '';
    return { clientId, clientSecret, merchantAccountNumber, webhookSecret };
  }

  isConfigured(config = {}) {
    const { clientId, clientSecret, merchantAccountNumber } = this._getCredentials(config);
    return Boolean(clientId && clientSecret && merchantAccountNumber);
  }

  getSupportedChannels(config = {}) {
    const channels = [];
    if (config.supportsMtnMomo !== false) channels.push(CHANNELS.MTN_MOMO);
    if (config.supportsTelecelCash !== false) channels.push(CHANNELS.TELECEL_CASH);
    if (config.supportsAtMoney !== false) channels.push(CHANNELS.AT_MONEY);
    if (config.supportsVisa !== false) channels.push(CHANNELS.VISA);
    if (config.supportsMastercard !== false) channels.push(CHANNELS.MASTERCARD);
    return channels;
  }

  getCapabilitySummary(config = {}) {
    return {
      gateway: this.gatewayName,
      configured: this.isConfigured(config),
      supportedChannels: this.getSupportedChannels(config),
      supportsDirectMomoPrompt: false,
      supportsHostedCheckout: true,
      supportsUssdFallback: false,
      supportsOtpStep: false,
      supportsMerchantAccountRouting: true
    };
  }

  _buildAuthHeader({ clientId, clientSecret }) {
    const encoded = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
    return `Basic ${encoded}`;
  }

  async initiatePayment({
    reference,
    amount,
    description,
    payerName,
    payerEmail,
    phoneResult,
    merchantAccountNumber,
    callbackUrl,
    returnUrl,
    cancellationUrl,
    config = {}
  }) {
    const creds = this._getCredentials({ ...config, merchantAccountNumber });
    if (!creds.clientId || !creds.clientSecret || !creds.merchantAccountNumber) {
      throw new AppError(
        'Hubtel API credentials (HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, HUBTEL_MERCHANT_ACCOUNT_NUMBER) are not configured on the server.',
        503
      );
    }
    if (typeof this.fetchFn !== 'function') {
      throw new AppError('HTTP fetch client unavailable for Hubtel API communication.', 500);
    }

    const payload = {
      totalAmount: roundMoney(amount),
      description: description || `School Fee Payment (${reference})`,
      callbackUrl: callbackUrl || process.env.HUBTEL_CALLBACK_URL || '',
      returnUrl: returnUrl || process.env.HUBTEL_RETURN_URL || '',
      cancellationUrl: cancellationUrl || returnUrl || process.env.HUBTEL_CANCELLATION_URL || '',
      merchantAccountNumber: creds.merchantAccountNumber,
      clientReference: reference,
      payeeName: payerName || undefined,
      payeeMobileNumber: phoneResult?.local || undefined,
      payeeEmail: payerEmail || undefined
    };

    const res = await this.fetchFn(`${this.checkoutBaseUrl}/items/initiate`, {
      method: 'POST',
      headers: {
        Authorization: this._buildAuthHeader(creds),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || (json.responseCode && json.responseCode !== '0000')) {
      throw new AppError(`Hubtel gateway error: ${json.message || json.responseCode || `HTTP ${res.status}`}`, 502);
    }

    const data = json.data || {};
    return {
      status: TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
      providerReference: data.checkoutId || reference,
      authorizationType: 'REDIRECT',
      authorizationUrl: data.checkoutDirectUrl || data.checkoutUrl || null,
      ussdInstruction: null,
      displayMessage:
        'Continue to Hubtel Official Checkout to authorize via Mobile Money or Card. Return to GBS afterward for verified confirmation.',
      rawResponse: data
    };
  }

  async verifyTransaction({ reference, merchantAccountNumber, config = {} }) {
    const creds = this._getCredentials({ ...config, merchantAccountNumber });
    if (!creds.clientId || !creds.clientSecret || !creds.merchantAccountNumber) {
      throw new AppError('Hubtel credentials are required to verify transaction status.', 503);
    }

    const url = `${this.statusBaseUrl}/transactions/${encodeURIComponent(creds.merchantAccountNumber)}/status?clientReference=${encodeURIComponent(reference)}`;
    const res = await this.fetchFn(url, {
      method: 'GET',
      headers: {
        Authorization: this._buildAuthHeader(creds),
        'Content-Type': 'application/json'
      }
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new AppError(`Hubtel status verification failed (HTTP ${res.status}).`, 502);
    }

    const data = json.data || {};
    const status = this.mapProviderStatus(data.status || json.status);
    return {
      verified: status === TRANSACTION_STATES.SUCCESSFUL,
      status,
      reference: data.clientReference || reference,
      providerReference: data.transactionId || data.checkoutId || reference,
      amount: data.amount !== undefined ? roundMoney(data.amount) : null,
      currency: String(data.currency || 'GHS').toUpperCase(),
      channel: data.paymentMethod ? String(data.paymentMethod).toUpperCase() : null,
      paidAt: data.date || null,
      gatewayResponse: data.status || json.message || 'Verified via Hubtel Status API',
      rawResponse: data
    };
  }

  mapProviderStatus(hubtelStatus) {
    const s = String(hubtelStatus || '').toLowerCase();
    if (s === 'paid' || s === 'success' || s === 'successful') return TRANSACTION_STATES.SUCCESSFUL;
    if (s === 'refunded') return TRANSACTION_STATES.REFUNDED;
    if (s === 'cancelled' || s === 'canceled') return TRANSACTION_STATES.CANCELLED;
    if (s === 'expired') return TRANSACTION_STATES.EXPIRED;
    if (s === 'failed' || s === 'declined') return TRANSACTION_STATES.FAILED;
    if (s === 'unpaid' || s === 'pending') return TRANSACTION_STATES.PROCESSING;
    return TRANSACTION_STATES.UNDER_REVIEW;
  }

  verifyWebhookSignature({ rawBody, headers = {}, payload = {}, config = {} }) {
    const { webhookSecret } = this._getCredentials(config);
    const sigHeader = headers['x-hubtel-signature'] || headers['X-Hubtel-Signature'];

    if (webhookSecret && sigHeader) {
      const payloadString = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8');
      const expected = crypto.createHmac('sha256', webhookSecret).update(payloadString).digest('hex');
      return timingSafeEqualsHex(expected, String(sigHeader).toLowerCase());
    }

    // If Hubtel static IP / callback secret isn't signed via header, require structural match and
    // service layer MUST perform mandatory server-to-server Status Check API verification before crediting.
    if (webhookSecret && !sigHeader) return false;
    const data = payload?.Data || payload?.data || payload;
    return Boolean(data && (data.ClientReference || data.clientReference));
  }

  parseWebhookEvent({ payload = {} }) {
    const data = payload.Data || payload.data || payload;
    const reference = data.ClientReference || data.clientReference || null;
    const providerReference = data.TransactionId || data.transactionId || data.CheckoutId || reference;
    const amountRaw = data.Amount ?? data.amount;
    const amount = amountRaw !== undefined ? roundMoney(amountRaw) : null;
    const rawStatus = data.Status || data.status || payload.Status || '';
    const responseCode = String(payload.ResponseCode || payload.responseCode || '');

    let mappedStatus = this.mapProviderStatus(rawStatus);
    if (!rawStatus && responseCode === '0000') {
      mappedStatus = TRANSACTION_STATES.SUCCESSFUL;
    } else if (!rawStatus && responseCode && responseCode !== '0000') {
      mappedStatus = TRANSACTION_STATES.FAILED;
    }

    return {
      eventId: providerReference ? `hub_${providerReference}_${mappedStatus}` : null,
      eventType: `hubtel.${String(rawStatus || responseCode || 'callback').toLowerCase()}`,
      reference,
      providerReference,
      amount,
      currency: String(data.Currency || 'GHS').toUpperCase(),
      mappedStatus,
      requiresServerVerify: !process.env.HUBTEL_WEBHOOK_SECRET,
      raw: data
    };
  }
}

module.exports = HubtelAdapter;
