'use strict';

const PaystackAdapter = require('./adapters/paystack.adapter');
const HubtelAdapter = require('./adapters/hubtel.adapter');
const BankDirectAdapter = require('./adapters/bankDirect.adapter');
const SandboxPspAdapter = require('./adapters/sandboxPsp.adapter');
const { GATEWAYS, CHANNELS, CHANNEL_LABELS } = require('./payments.constants');
const { maskSecretPreview } = require('./payments.utils');
const prisma = require('../../core/database/prisma.client');
const { ensurePaymentTables } = require('../../core/database/ensurePaymentTables');

const adapters = {
  [GATEWAYS.PAYSTACK]: new PaystackAdapter(),
  [GATEWAYS.HUBTEL]: new HubtelAdapter(),
  [GATEWAYS.BANK_DIRECT]: new BankDirectAdapter(),
  [GATEWAYS.SANDBOX_PSP]: new SandboxPspAdapter()
};

function getAdapter(gateway) {
  const key = String(gateway || '').toUpperCase();
  return adapters[key] || null;
}

function getAllAdapters() {
  return adapters;
}

/**
 * Allows injecting test-double adapters (e.g. HTTP mocked Paystack/Hubtel) during verification suites.
 */
function registerAdapterOverride(gateway, instance) {
  adapters[String(gateway).toUpperCase()] = instance;
}

function resetDefaultAdapters() {
  adapters[GATEWAYS.PAYSTACK] = new PaystackAdapter();
  adapters[GATEWAYS.HUBTEL] = new HubtelAdapter();
  adapters[GATEWAYS.BANK_DIRECT] = new BankDirectAdapter();
  adapters[GATEWAYS.SANDBOX_PSP] = new SandboxPspAdapter();
}

function getEnvDefaultConfigs(tenantId = 1) {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY || '';
  const paystackPublic = process.env.PAYSTACK_PUBLIC_KEY || '';
  const paystackLive = paystackSecret.startsWith('sk_live_');

  const hubtelClientId = process.env.HUBTEL_CLIENT_ID || '';
  const hubtelSecret = process.env.HUBTEL_CLIENT_SECRET || '';
  const hubtelMerchant = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || '';

  const hasAnyLiveGateway = Boolean(paystackSecret || (hubtelClientId && hubtelSecret && hubtelMerchant));

  return [
    {
      tenantId,
      gateway: GATEWAYS.PAYSTACK,
      mode: paystackLive ? 'LIVE' : 'TEST',
      isEnabled: Boolean(paystackSecret),
      supportsMtnMomo: true,
      supportsTelecelCash: true,
      supportsAtMoney: true,
      supportsVisa: true,
      supportsMastercard: true,
      supportsBankTransfer: true,
      paystackSubaccountCode: process.env.PAYSTACK_DEFAULT_SUBACCOUNT || null,
      settlementLabel: 'Paystack Ghana Merchant / Subaccount',
      allowPartialPayments: true,
      minPartialPercent: 20,
      publicKeyPreview: paystackPublic ? maskSecretPreview(paystackPublic) : maskSecretPreview(paystackSecret)
    },
    {
      tenantId,
      gateway: GATEWAYS.HUBTEL,
      mode: process.env.HUBTEL_MODE === 'LIVE' ? 'LIVE' : 'TEST',
      isEnabled: Boolean(hubtelClientId && hubtelSecret && hubtelMerchant),
      supportsMtnMomo: true,
      supportsTelecelCash: true,
      supportsAtMoney: true,
      supportsVisa: true,
      supportsMastercard: true,
      supportsBankTransfer: false,
      hubtelMerchantAccount: hubtelMerchant || null,
      settlementLabel: 'Hubtel Official Ghana Checkout',
      allowPartialPayments: true,
      minPartialPercent: 20,
      publicKeyPreview: hubtelClientId ? maskSecretPreview(hubtelClientId) : null
    },
    {
      tenantId,
      gateway: GATEWAYS.BANK_DIRECT,
      mode: 'LIVE',
      isEnabled: false,
      supportsMtnMomo: false,
      supportsTelecelCash: false,
      supportsAtMoney: false,
      supportsVisa: false,
      supportsMastercard: false,
      supportsBankTransfer: true,
      bankName: process.env.SCHOOL_DEFAULT_BANK_NAME || null,
      bankAccountNumber: process.env.SCHOOL_DEFAULT_BANK_ACCOUNT || null,
      bankAccountName: process.env.SCHOOL_DEFAULT_BANK_ACCOUNT_NAME || null,
      bankBranch: process.env.SCHOOL_DEFAULT_BANK_BRANCH || null,
      settlementLabel: 'Official Institutional Bank Account',
      allowPartialPayments: true,
      minPartialPercent: 20,
      publicKeyPreview: null
    },
    {
      tenantId,
      gateway: GATEWAYS.SANDBOX_PSP,
      mode: 'TEST',
      // Available automatically in TEST/Sandbox mode when live keys are not yet configured, or when explicitly enabled
      isEnabled: !hasAnyLiveGateway || Number(tenantId) === 1,
      supportsMtnMomo: true,
      supportsTelecelCash: true,
      supportsAtMoney: true,
      supportsVisa: true,
      supportsMastercard: true,
      supportsBankTransfer: false,
      settlementLabel: 'Official Test & Demo Sandbox Gateway (No Real Funds)',
      allowPartialPayments: true,
      minPartialPercent: 20,
      publicKeyPreview: 'sandbox_test_hmac'
    }
  ];
}

async function getTenantGatewayConfigs(tenantId = 1) {
  await ensurePaymentTables();
  const tid = parseInt(tenantId, 10) || 1;
  const envDefaults = getEnvDefaultConfigs(tid);

  let dbConfigs = [];
  let platformDefaults = [];
  try {
    dbConfigs = await prisma.paymentGatewayConfig.findMany({ where: { tenantId: tid } });
    if (tid !== 0) {
      platformDefaults = await prisma.paymentGatewayConfig.findMany({ where: { tenantId: 0 } });
    }
  } catch {
    dbConfigs = [];
  }

  return envDefaults.map((def) => {
    const plat = platformDefaults.find((c) => c.gateway === def.gateway);
    const tenantRec = dbConfigs.find((c) => c.gateway === def.gateway);
    const merged = {
      ...def,
      ...(plat || {}),
      ...(tenantRec || {}),
      tenantId: tid
    };
    const adapter = getAdapter(merged.gateway);
    const adapterConfigured = adapter ? adapter.isConfigured(merged) : false;

    // Never allow SANDBOX_PSP in LIVE mode
    const effectiveEnabled =
      merged.gateway === GATEWAYS.SANDBOX_PSP
        ? Boolean(merged.isEnabled && merged.mode !== 'LIVE' && adapterConfigured)
        : Boolean(merged.isEnabled && adapterConfigured);

    const supportedChannels = adapter && effectiveEnabled ? adapter.getSupportedChannels(merged) : [];

    return {
      ...merged,
      adapterConfigured,
      effectiveEnabled,
      supportedChannels,
      capabilities: adapter ? adapter.getCapabilitySummary(merged) : null
    };
  });
}

async function upsertTenantGatewayConfig(tenantId, gateway, updates = {}, updatedById = null) {
  await ensurePaymentTables();
  const tid = parseInt(tenantId, 10);
  const safeTid = Number.isFinite(tid) ? tid : 1;
  const gw = String(gateway || '').toUpperCase();
  if (!GATEWAYS[gw]) {
    throw new Error(`Unsupported gateway ${gateway}`);
  }

  const allowedFields = {
    mode: updates.mode === 'LIVE' && gw !== GATEWAYS.SANDBOX_PSP ? 'LIVE' : 'TEST',
    isEnabled: updates.isEnabled !== undefined ? Boolean(updates.isEnabled) : undefined,
    supportsMtnMomo: updates.supportsMtnMomo !== undefined ? Boolean(updates.supportsMtnMomo) : undefined,
    supportsTelecelCash: updates.supportsTelecelCash !== undefined ? Boolean(updates.supportsTelecelCash) : undefined,
    supportsAtMoney: updates.supportsAtMoney !== undefined ? Boolean(updates.supportsAtMoney) : undefined,
    supportsVisa: updates.supportsVisa !== undefined ? Boolean(updates.supportsVisa) : undefined,
    supportsMastercard: updates.supportsMastercard !== undefined ? Boolean(updates.supportsMastercard) : undefined,
    supportsBankTransfer: updates.supportsBankTransfer !== undefined ? Boolean(updates.supportsBankTransfer) : undefined,
    paystackSubaccountCode: updates.paystackSubaccountCode !== undefined ? (updates.paystackSubaccountCode || null) : undefined,
    hubtelMerchantAccount: updates.hubtelMerchantAccount !== undefined ? (updates.hubtelMerchantAccount || null) : undefined,
    bankName: updates.bankName !== undefined ? (updates.bankName || null) : undefined,
    bankAccountNumber: updates.bankAccountNumber !== undefined ? (updates.bankAccountNumber || null) : undefined,
    bankAccountName: updates.bankAccountName !== undefined ? (updates.bankAccountName || null) : undefined,
    bankBranch: updates.bankBranch !== undefined ? (updates.bankBranch || null) : undefined,
    settlementLabel: updates.settlementLabel !== undefined ? (updates.settlementLabel || null) : undefined,
    allowPartialPayments: updates.allowPartialPayments !== undefined ? Boolean(updates.allowPartialPayments) : undefined,
    minPartialPercent: updates.minPartialPercent !== undefined ? Math.max(1, Math.min(100, Number(updates.minPartialPercent) || 20)) : undefined,
    updatedById: updatedById || null
  };

  Object.keys(allowedFields).forEach((k) => allowedFields[k] === undefined && delete allowedFields[k]);

  const existing = await prisma.paymentGatewayConfig.findFirst({
    where: { tenantId: safeTid, gateway: gw }
  }).catch(() => null);

  if (existing) {
    return prisma.paymentGatewayConfig.update({
      where: { id: existing.id },
      data: allowedFields
    });
  }

  const base = getEnvDefaultConfigs(safeTid).find((c) => c.gateway === gw) || {};
  return prisma.paymentGatewayConfig.create({
    data: {
      tenantId: safeTid,
      gateway: gw,
      mode: allowedFields.mode || base.mode || 'TEST',
      isEnabled: allowedFields.isEnabled !== undefined ? allowedFields.isEnabled : Boolean(base.isEnabled),
      supportsMtnMomo: allowedFields.supportsMtnMomo !== undefined ? allowedFields.supportsMtnMomo : Boolean(base.supportsMtnMomo),
      supportsTelecelCash: allowedFields.supportsTelecelCash !== undefined ? allowedFields.supportsTelecelCash : Boolean(base.supportsTelecelCash),
      supportsAtMoney: allowedFields.supportsAtMoney !== undefined ? allowedFields.supportsAtMoney : Boolean(base.supportsAtMoney),
      supportsVisa: allowedFields.supportsVisa !== undefined ? allowedFields.supportsVisa : Boolean(base.supportsVisa),
      supportsMastercard: allowedFields.supportsMastercard !== undefined ? allowedFields.supportsMastercard : Boolean(base.supportsMastercard),
      supportsBankTransfer: allowedFields.supportsBankTransfer !== undefined ? allowedFields.supportsBankTransfer : Boolean(base.supportsBankTransfer),
      paystackSubaccountCode: allowedFields.paystackSubaccountCode ?? base.paystackSubaccountCode ?? null,
      hubtelMerchantAccount: allowedFields.hubtelMerchantAccount ?? base.hubtelMerchantAccount ?? null,
      bankName: allowedFields.bankName ?? base.bankName ?? null,
      bankAccountNumber: allowedFields.bankAccountNumber ?? base.bankAccountNumber ?? null,
      bankAccountName: allowedFields.bankAccountName ?? base.bankAccountName ?? null,
      bankBranch: allowedFields.bankBranch ?? base.bankBranch ?? null,
      settlementLabel: allowedFields.settlementLabel ?? base.settlementLabel ?? null,
      allowPartialPayments: allowedFields.allowPartialPayments !== undefined ? allowedFields.allowPartialPayments : true,
      minPartialPercent: allowedFields.minPartialPercent !== undefined ? allowedFields.minPartialPercent : 20,
      publicKeyPreview: base.publicKeyPreview || null,
      updatedById: updatedById || null
    }
  });
}

async function resolveGatewayAndChannels(tenantId = 1) {
  const configs = await getTenantGatewayConfigs(tenantId);
  const channelOptions = [];

  for (const ch of Object.keys(CHANNELS)) {
    const supporting = configs.filter((c) => c.effectiveEnabled && c.supportedChannels.includes(ch));
    if (supporting.length > 0) {
      // Prefer real production PSPs (PAYSTACK / HUBTEL / BANK_DIRECT) before SANDBOX_PSP when configured
      const ordered = [...supporting].sort((a, b) => {
        const rank = { PAYSTACK: 1, HUBTEL: 2, BANK_DIRECT: 3, SANDBOX_PSP: 4 };
        return (rank[a.gateway] || 9) - (rank[b.gateway] || 9);
      });
      channelOptions.push({
        channel: ch,
        label: CHANNEL_LABELS[ch] || ch,
        available: true,
        primaryGateway: ordered[0].gateway,
        mode: ordered[0].mode,
        isSandbox: ordered[0].gateway === GATEWAYS.SANDBOX_PSP,
        gateways: ordered.map((g) => ({
          gateway: g.gateway,
          mode: g.mode,
          settlementLabel: g.settlementLabel,
          supportsDirectMomoPrompt: Boolean(g.capabilities?.supportsDirectMomoPrompt),
          supportsHostedCheckout: Boolean(g.capabilities?.supportsHostedCheckout)
        }))
      });
    }
  }

  return { configs, channels: channelOptions };
}

module.exports = {
  getAdapter,
  getAllAdapters,
  registerAdapterOverride,
  resetDefaultAdapters,
  getTenantGatewayConfigs,
  upsertTenantGatewayConfig,
  resolveGatewayAndChannels
};
