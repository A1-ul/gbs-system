'use strict';

const crypto = require('crypto');
const BasePaymentAdapter = require('./base.adapter');
const { CHANNELS, GATEWAYS, TRANSACTION_STATES } = require('../payments.constants');
const { timingSafeEqualsHex, roundMoney } = require('../payments.utils');
const AppError = require('../../../core/errors/AppError');

/**
 * Official Test-Mode / Sandbox PSP Adapter.
 * Executes the exact async payment lifecycle (CREATED -> REQUIRES_CUSTOMER_ACTION -> PROCESSING ->
 * verified webhook settlement -> receipt & ledger update) ONLY when gateway mode is explicitly TEST/SANDBOX.
 * Never enabled in LIVE production mode without explicit test configuration.
 */
class SandboxPspAdapter extends BasePaymentAdapter {
  constructor() {
    super(GATEWAYS.SANDBOX_PSP);
  }

  _getWebhookSecret() {
    return process.env.SANDBOX_PAYMENT_WEBHOOK_SECRET || process.env.JWT_SECRET || 'gbs_sandbox_psp_hmac_secret';
  }

  isConfigured(config = {}) {
    if (String(config.mode || 'TEST').toUpperCase() === 'LIVE') return false;
    return true;
  }

  getSupportedChannels(config = {}) {
    if (!this.isConfigured(config)) return [];
    const list = [];
    if (config.supportsMtnMomo !== false) list.push(CHANNELS.MTN_MOMO);
    if (config.supportsTelecelCash !== false) list.push(CHANNELS.TELECEL_CASH);
    if (config.supportsAtMoney !== false) list.push(CHANNELS.AT_MONEY);
    if (config.supportsVisa !== false) list.push(CHANNELS.VISA);
    if (config.supportsMastercard !== false) list.push(CHANNELS.MASTERCARD);
    if (config.supportsBankTransfer !== false) list.push(CHANNELS.BANK_TRANSFER);
    return list;
  }

  getCapabilitySummary(config = {}) {
    return {
      gateway: this.gatewayName,
      configured: this.isConfigured(config),
      isSandboxOnly: true,
      supportedChannels: this.getSupportedChannels(config),
      supportsDirectMomoPrompt: true,
      supportsHostedCheckout: true,
      supportsUssdFallback: true,
      supportsOtpStep: false
    };
  }

  async initiatePayment({
    reference,
    amount,
    currency = 'GHS',
    channel,
    phoneResult,
    preferHostedCheckout = false,
    apiBaseUrl = ''
  }) {
    const providerReference = `SBX-${Date.now()}-${reference.slice(-6)}`;
    const isCardOrHosted =
      preferHostedCheckout ||
      [CHANNELS.VISA, CHANNELS.MASTERCARD, CHANNELS.BANK_TRANSFER].includes(channel);

    if (isCardOrHosted) {
      const hostedPath = `${apiBaseUrl}/api/v1/payments/sandbox-checkout/${encodeURIComponent(reference)}`;
      return {
        status: TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
        providerReference,
        authorizationType: 'REDIRECT',
        authorizationUrl: hostedPath,
        ussdInstruction: null,
        displayMessage:
          `[SANDBOX TEST MODE] Continue to the Sandbox Hosted Checkout page to approve or decline ${currency} ${roundMoney(amount).toFixed(2)}.`,
        rawResponse: { mode: 'SANDBOX', hostedPath, providerReference }
      };
    }

    return {
      status: TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
      providerReference,
      authorizationType: 'PHONE_PROMPT',
      authorizationUrl: null,
      ussdInstruction: `[SANDBOX TEST] Approve authorization on handset ${phoneResult?.masked || ''} using the sandbox webhook confirmation control (or switch to Hosted Browser Checkout).`,
      displayMessage: `[SANDBOX TEST MODE] Authorization request sent for ${phoneResult?.masked || 'your mobile number'}. Waiting for verified provider webhook confirmation (no real funds moved).`,
      rawResponse: { mode: 'SANDBOX', channel, providerReference }
    };
  }

  async verifyTransaction({ reference, existingTransaction }) {
    const currentStatus = existingTransaction?.gatewayStatus || TRANSACTION_STATES.PROCESSING;
    return {
      verified: currentStatus === TRANSACTION_STATES.SUCCESSFUL,
      status: currentStatus,
      reference,
      providerReference: existingTransaction?.providerReference || reference,
      amount: roundMoney(existingTransaction?.expectedAmount || existingTransaction?.amountPaid || 0),
      currency: existingTransaction?.currency || 'GHS',
      channel: existingTransaction?.channel || null,
      gatewayResponse: `[SANDBOX TEST MODE] Current verified state: ${currentStatus}`
    };
  }

  signWebhookPayload(rawPayloadString) {
    return crypto
      .createHmac('sha256', this._getWebhookSecret())
      .update(String(rawPayloadString || ''), 'utf8')
      .digest('hex');
  }

  verifyWebhookSignature({ rawBody, headers = {} }) {
    const signature = headers['x-sandbox-signature'] || headers['X-Sandbox-Signature'];
    if (!signature) return false;
    const rawStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
    const expected = this.signWebhookPayload(rawStr);
    return timingSafeEqualsHex(expected, String(signature).toLowerCase());
  }

  parseWebhookEvent({ payload = {} }) {
    const outcome = String(payload.outcome || payload.status || 'SUCCESSFUL').toUpperCase();
    const mapped = TRANSACTION_STATES[outcome] || TRANSACTION_STATES.FAILED;
    if (!payload.reference) {
      throw new AppError('Sandbox webhook requires transaction reference.', 400);
    }
    return {
      eventId: payload.eventId || `sbx_${payload.reference}_${Date.now()}`,
      eventType: `sandbox.${mapped.toLowerCase()}`,
      reference: payload.reference,
      providerReference: payload.providerReference || `SBX-CONF-${payload.reference}`,
      amount: payload.amount !== undefined ? roundMoney(payload.amount) : null,
      currency: String(payload.currency || 'GHS').toUpperCase(),
      mappedStatus: mapped,
      raw: payload
    };
  }
}

module.exports = SandboxPspAdapter;
