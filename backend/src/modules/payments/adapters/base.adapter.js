'use strict';

/**
 * Base contract for payment gateway adapters.
 * Every gateway implements its own official API initiation, OTP/step submission,
 * server-to-server verification, and webhook signature verification logic.
 */
class BasePaymentAdapter {
  constructor(gatewayName) {
    this.gatewayName = gatewayName;
  }

  isConfigured(_config = {}) {
    return false;
  }

  getSupportedChannels(_config = {}) {
    return [];
  }

  getCapabilitySummary(config = {}) {
    return {
      gateway: this.gatewayName,
      configured: this.isConfigured(config),
      supportedChannels: this.getSupportedChannels(config),
      supportsDirectMomoPrompt: false,
      supportsHostedCheckout: false,
      supportsUssdFallback: false,
      supportsOtpStep: false
    };
  }

  async initiatePayment(_params) {
    throw new Error(`${this.gatewayName}.initiatePayment not implemented`);
  }

  async submitAuthorizationStep(_params) {
    throw new Error(`${this.gatewayName} does not support step submission`);
  }

  async verifyTransaction(_params) {
    throw new Error(`${this.gatewayName}.verifyTransaction not implemented`);
  }

  verifyWebhookSignature(_params) {
    return false;
  }

  parseWebhookEvent(_params) {
    return null;
  }
}

module.exports = BasePaymentAdapter;
