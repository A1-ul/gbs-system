'use strict';

const BasePaymentAdapter = require('./base.adapter');
const { CHANNELS, GATEWAYS, TRANSACTION_STATES } = require('../payments.constants');
const AppError = require('../../../core/errors/AppError');

class BankDirectAdapter extends BasePaymentAdapter {
  constructor() {
    super(GATEWAYS.BANK_DIRECT);
  }

  isConfigured(config = {}) {
    return Boolean(config.bankName && config.bankAccountNumber && config.bankAccountName);
  }

  getSupportedChannels(config = {}) {
    return this.isConfigured(config) ? [CHANNELS.BANK_TRANSFER] : [];
  }

  getCapabilitySummary(config = {}) {
    return {
      gateway: this.gatewayName,
      configured: this.isConfigured(config),
      supportedChannels: this.getSupportedChannels(config),
      supportsDirectMomoPrompt: false,
      supportsHostedCheckout: false,
      supportsUssdFallback: false,
      supportsOtpStep: false,
      requiresFinanceReconciliation: true
    };
  }

  async initiatePayment({ reference, amount, currency = 'GHS', config = {}, institutionName = 'School' }) {
    if (!this.isConfigured(config)) {
      throw new AppError(
        'Bank transfer details have not been configured by the school finance office yet.',
        503
      );
    }

    const bankSummary = `${config.bankName}${config.bankBranch ? ` (${config.bankBranch})` : ''} • Account Name: ${config.bankAccountName} • Account No: ${config.bankAccountNumber}`;
    return {
      status: TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
      providerReference: reference,
      authorizationType: 'BANK_REFERENCE',
      authorizationUrl: null,
      ussdInstruction: bankSummary,
      displayMessage: `Transfer exact amount (${currency} ${Number(amount).toFixed(2)}) to ${institutionName}'s official bank account (${bankSummary}) using reference "${reference}". Your fee statement updates once the bank transfer is verified.`,
      rawResponse: {
        bankName: config.bankName,
        bankAccountNumber: config.bankAccountNumber,
        bankAccountName: config.bankAccountName,
        bankBranch: config.bankBranch || null,
        reference
      }
    };
  }

  async verifyTransaction({ existingTransaction }) {
    // Bank direct deposits remain UNDER_REVIEW until finance team / bank feed reconciles them
    return {
      verified: existingTransaction?.gatewayStatus === TRANSACTION_STATES.SUCCESSFUL,
      status: existingTransaction?.gatewayStatus || TRANSACTION_STATES.UNDER_REVIEW,
      reference: existingTransaction?.reference,
      providerReference: existingTransaction?.providerReference || existingTransaction?.reference,
      amount: existingTransaction?.amountPaid,
      currency: existingTransaction?.currency || 'GHS',
      gatewayResponse:
        existingTransaction?.gatewayStatus === TRANSACTION_STATES.SUCCESSFUL
          ? 'Bank settlement confirmed by institution finance office'
          : 'Awaiting bank clearing verification'
    };
  }
}

module.exports = BankDirectAdapter;
