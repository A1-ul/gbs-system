'use strict';

const BasePaymentAdapter = require('./base.adapter');
const { CHANNELS, GATEWAYS, TRANSACTION_STATES } = require('../payments.constants');
const AppError = require('../../../core/errors/AppError');

class BankDirectAdapter extends BasePaymentAdapter {
  constructor() {
    super(GATEWAYS.BANK_DIRECT);
  }

  _resolveBankDetails(config = {}, paymentScope = 'SCHOOL_FEES') {
    if (String(paymentScope || '').toUpperCase() === 'SUBSCRIPTION') {
      const devBankName = process.env.DEVELOPER_BANK_NAME || config.bankName || null;
      const devBankAcct = process.env.DEVELOPER_BANK_ACCOUNT || config.bankAccountNumber || null;
      const devBankAcctName = process.env.DEVELOPER_BANK_ACCOUNT_NAME || config.bankAccountName || null;
      const devBankBranch = process.env.DEVELOPER_BANK_BRANCH || config.bankBranch || null;
      return {
        bankName: devBankName,
        bankAccountNumber: devBankAcct,
        bankAccountName: devBankAcctName,
        bankBranch: devBankBranch
      };
    }
    return {
      bankName: config.bankName || null,
      bankAccountNumber: config.bankAccountNumber || null,
      bankAccountName: config.bankAccountName || null,
      bankBranch: config.bankBranch || null
    };
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

  async initiatePayment({ reference, amount, currency = 'GHS', config = {}, institutionName = 'School', metadata = {} }) {
    const scope = metadata?.paymentScope || 'SCHOOL_FEES';
    const bank = this._resolveBankDetails(config, scope);
    if (!bank.bankName || !bank.bankAccountNumber || !bank.bankAccountName) {
      throw new AppError(
        scope === 'SUBSCRIPTION'
          ? 'Developer bank settlement account details have not been configured yet. Use Mobile Money or Card checkout.'
          : 'Bank transfer details have not been configured by the school finance office yet.',
        503
      );
    }

    const recipientLabel = scope === 'SUBSCRIPTION' ? 'GBS Platform Developer' : institutionName;
    const bankSummary = `${bank.bankName}${bank.bankBranch ? ` (${bank.bankBranch})` : ''} • Account Name: ${bank.bankAccountName} • Account No: ${bank.bankAccountNumber}`;
    return {
      status: TRANSACTION_STATES.REQUIRES_CUSTOMER_ACTION,
      providerReference: reference,
      authorizationType: 'BANK_REFERENCE',
      authorizationUrl: null,
      ussdInstruction: bankSummary,
      displayMessage: `Transfer exact amount (${currency} ${Number(amount).toFixed(2)}) from your bank app or branch to ${recipientLabel}'s official bank account (${bankSummary}) using reference "${reference}". Your account statement updates automatically once verified.`,
      rawResponse: {
        bankName: bank.bankName,
        bankAccountNumber: bank.bankAccountNumber,
        bankAccountName: bank.bankAccountName,
        bankBranch: bank.bankBranch || null,
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
