'use strict';

const PaystackAdapter = require('./adapters/paystack.adapter');
const HubtelAdapter = require('./adapters/hubtel.adapter');
const BankDirectAdapter = require('./adapters/bankDirect.adapter');
const SandboxPspAdapter = require('./adapters/sandboxPsp.adapter');
const { GATEWAYS, CHANNELS, CHANNEL_LABELS } = require('./payments.constants');
const { maskSecretPreview, encryptGatewaySecret, decryptGatewaySecret } = require('./payments.utils');
const prisma = require('../../core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
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
      supportsBankTransfer: true,
      settlementLabel: 'Official Test & Demo Sandbox Gateway (No Real Funds)',
      allowPartialPayments: true,
      minPartialPercent: 20,
      publicKeyPreview: 'sandbox_test_hmac'
    }
  ];
}

function _getStoredSecretsMap(tid) {
  const store = readPersistentStore();
  return store.paymentGatewaySecrets?.[String(tid)] || {};
}

function _resolveRuntimeSecrets(merged, tid = 1) {
  const tenantSecrets = _getStoredSecretsMap(tid)?.[merged.gateway] || {};
  const globalSecrets = Number(tid) !== 0 ? (_getStoredSecretsMap(0)?.[merged.gateway] || {}) : {};
  const paystackSecretKey =
    decryptGatewaySecret(merged.paystackSecretKeyEnc) ||
    decryptGatewaySecret(tenantSecrets.paystackSecretKeyEnc) ||
    decryptGatewaySecret(globalSecrets.paystackSecretKeyEnc) ||
    process.env.PAYSTACK_SECRET_KEY ||
    '';
  const paystackWebhookSecret =
    decryptGatewaySecret(merged.paystackWebhookSecretEnc) ||
    decryptGatewaySecret(tenantSecrets.paystackWebhookSecretEnc) ||
    decryptGatewaySecret(globalSecrets.paystackWebhookSecretEnc) ||
    process.env.PAYSTACK_WEBHOOK_SECRET ||
    '';
  const hubtelClientId =
    merged.hubtelClientId ||
    tenantSecrets.hubtelClientId ||
    globalSecrets.hubtelClientId ||
    process.env.HUBTEL_CLIENT_ID ||
    '';
  const hubtelClientSecret =
    decryptGatewaySecret(merged.hubtelClientSecretEnc) ||
    decryptGatewaySecret(tenantSecrets.hubtelClientSecretEnc) ||
    decryptGatewaySecret(globalSecrets.hubtelClientSecretEnc) ||
    process.env.HUBTEL_CLIENT_SECRET ||
    '';
  const hubtelWebhookSecret =
    decryptGatewaySecret(merged.hubtelWebhookSecretEnc) ||
    decryptGatewaySecret(tenantSecrets.hubtelWebhookSecretEnc) ||
    decryptGatewaySecret(globalSecrets.hubtelWebhookSecretEnc) ||
    process.env.HUBTEL_WEBHOOK_SECRET ||
    '';

  if (merged.gateway === GATEWAYS.PAYSTACK) {
    return {
      secretKey: paystackSecretKey,
      webhookSecret: paystackWebhookSecret,
      paystackPublicKey: merged.paystackPublicKey || tenantSecrets.paystackPublicKey || process.env.PAYSTACK_PUBLIC_KEY || ''
    };
  }
  if (merged.gateway === GATEWAYS.HUBTEL) {
    return {
      clientId: hubtelClientId,
      clientSecret: hubtelClientSecret,
      webhookSecret: hubtelWebhookSecret,
      hubtelMerchantAccount:
        merged.hubtelMerchantAccount ||
        tenantSecrets.hubtelMerchantAccount ||
        process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER ||
        ''
    };
  }
  return {};
}

function _buildSafePublicConfig(merged, runtimeSecrets = {}) {
  const copy = { ...merged };
  delete copy.paystackSecretKeyEnc;
  delete copy.paystackWebhookSecretEnc;
  delete copy.hubtelClientSecretEnc;
  delete copy.hubtelWebhookSecretEnc;
  delete copy.secretKey;
  delete copy.clientSecret;
  delete copy.webhookSecret;

  const hasSecretKey = Boolean(
    runtimeSecrets.secretKey ||
    (runtimeSecrets.clientId && runtimeSecrets.clientSecret) ||
    (copy.gateway === GATEWAYS.PAYSTACK && process.env.PAYSTACK_SECRET_KEY) ||
    (copy.gateway === GATEWAYS.HUBTEL && process.env.HUBTEL_CLIENT_ID && process.env.HUBTEL_CLIENT_SECRET)
  );

  return {
    ...copy,
    hasSecretKey,
    paystackPublicKey: runtimeSecrets.paystackPublicKey || copy.paystackPublicKey || null,
    hubtelClientId: runtimeSecrets.hubtelClientId || copy.hubtelClientId || null
  };
}

async function getTenantGatewayConfigs(tenantId = 1, options = {}) {
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
    const tenantSecrets = _getStoredSecretsMap(tid)?.[def.gateway] || {};
    const globalSecrets = Number(tid) !== 0 ? (_getStoredSecretsMap(0)?.[def.gateway] || {}) : {};
    const merged = {
      ...def,
      ...(plat || {}),
      ...(globalSecrets || {}),
      ...(tenantRec || {}),
      ...(tenantSecrets || {}),
      tenantId: tid
    };
    const runtimeSecrets = _resolveRuntimeSecrets(merged, tid);
    const configWithSecrets = { ...merged, ...runtimeSecrets };
    const adapter = getAdapter(merged.gateway);
    const adapterConfigured = adapter ? adapter.isConfigured(configWithSecrets) : false;

    // Never allow SANDBOX_PSP in LIVE mode
    const effectiveEnabled =
      merged.gateway === GATEWAYS.SANDBOX_PSP
        ? Boolean(merged.isEnabled && merged.mode !== 'LIVE' && adapterConfigured)
        : Boolean(merged.isEnabled && adapterConfigured);

    const supportedChannels = adapter && effectiveEnabled ? adapter.getSupportedChannels(configWithSecrets) : [];
    const safeMerged = _buildSafePublicConfig(merged, runtimeSecrets);

    const out = {
      ...safeMerged,
      adapterConfigured,
      effectiveEnabled,
      supportedChannels,
      capabilities: adapter ? adapter.getCapabilitySummary(configWithSecrets) : null
    };
    if (options.includeSecrets) {
      return { ...out, ...runtimeSecrets };
    }
    return out;
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
    paystackPublicKey: updates.paystackPublicKey !== undefined ? (String(updates.paystackPublicKey || '').trim() || null) : undefined,
    paystackSecretKeyEnc:
      updates.paystackSecretKey && String(updates.paystackSecretKey).trim()
        ? encryptGatewaySecret(updates.paystackSecretKey)
        : undefined,
    paystackWebhookSecretEnc:
      updates.paystackWebhookSecret && String(updates.paystackWebhookSecret).trim()
        ? encryptGatewaySecret(updates.paystackWebhookSecret)
        : undefined,
    hubtelMerchantAccount: updates.hubtelMerchantAccount !== undefined ? (updates.hubtelMerchantAccount || null) : undefined,
    hubtelClientId: updates.hubtelClientId !== undefined ? (String(updates.hubtelClientId || '').trim() || null) : undefined,
    hubtelClientSecretEnc:
      updates.hubtelClientSecret && String(updates.hubtelClientSecret).trim()
        ? encryptGatewaySecret(updates.hubtelClientSecret)
        : undefined,
    hubtelWebhookSecretEnc:
      updates.hubtelWebhookSecret && String(updates.hubtelWebhookSecret).trim()
        ? encryptGatewaySecret(updates.hubtelWebhookSecret)
        : undefined,
    bankName: updates.bankName !== undefined ? (updates.bankName || null) : undefined,
    bankAccountNumber: updates.bankAccountNumber !== undefined ? (updates.bankAccountNumber || null) : undefined,
    bankAccountName: updates.bankAccountName !== undefined ? (updates.bankAccountName || null) : undefined,
    bankBranch: updates.bankBranch !== undefined ? (updates.bankBranch || null) : undefined,
    settlementLabel: updates.settlementLabel !== undefined ? (updates.settlementLabel || null) : undefined,
    allowPartialPayments: updates.allowPartialPayments !== undefined ? Boolean(updates.allowPartialPayments) : undefined,
    minPartialPercent: updates.minPartialPercent !== undefined ? Math.max(1, Math.min(100, Number(updates.minPartialPercent) || 20)) : undefined,
    updatedById: updatedById || null
  };

  let computedPreview = null;
  if (gw === GATEWAYS.PAYSTACK) {
    computedPreview = updates.paystackPublicKey
      ? maskSecretPreview(updates.paystackPublicKey)
      : updates.paystackSecretKey
        ? maskSecretPreview(updates.paystackSecretKey)
        : null;
  } else if (gw === GATEWAYS.HUBTEL && updates.hubtelClientId) {
    computedPreview = maskSecretPreview(updates.hubtelClientId);
  }

  Object.keys(allowedFields).forEach((k) => allowedFields[k] === undefined && delete allowedFields[k]);

  writePersistentStore((curr) => {
    const map = curr.paymentGatewaySecrets || {};
    const tMap = map[String(safeTid)] || {};
    const prevGw = tMap[gw] || {};
    return {
      ...curr,
      paymentGatewaySecrets: {
        ...map,
        [String(safeTid)]: {
          ...tMap,
          [gw]: {
            ...prevGw,
            ...allowedFields,
            ...(computedPreview ? { publicKeyPreview: computedPreview } : {})
          }
        }
      }
    };
  });

  const existing = await prisma.paymentGatewayConfig.findFirst({
    where: { tenantId: safeTid, gateway: gw }
  }).catch(() => null);

  if (existing) {
    try {
      await prisma.paymentGatewayConfig.update({
        where: { id: existing.id },
        data: {
          ...allowedFields,
          ...(computedPreview ? { publicKeyPreview: computedPreview } : {})
        }
      });
    } catch { }
  } else {
    const base = getEnvDefaultConfigs(safeTid).find((c) => c.gateway === gw) || {};
    try {
      await prisma.paymentGatewayConfig.create({
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
          paystackPublicKey: allowedFields.paystackPublicKey ?? base.paystackPublicKey ?? null,
          paystackSecretKeyEnc: allowedFields.paystackSecretKeyEnc ?? null,
          paystackWebhookSecretEnc: allowedFields.paystackWebhookSecretEnc ?? null,
          hubtelMerchantAccount: allowedFields.hubtelMerchantAccount ?? base.hubtelMerchantAccount ?? null,
          hubtelClientId: allowedFields.hubtelClientId ?? null,
          hubtelClientSecretEnc: allowedFields.hubtelClientSecretEnc ?? null,
          hubtelWebhookSecretEnc: allowedFields.hubtelWebhookSecretEnc ?? null,
          bankName: allowedFields.bankName ?? base.bankName ?? null,
          bankAccountNumber: allowedFields.bankAccountNumber ?? base.bankAccountNumber ?? null,
          bankAccountName: allowedFields.bankAccountName ?? base.bankAccountName ?? null,
          bankBranch: allowedFields.bankBranch ?? base.bankBranch ?? null,
          settlementLabel: allowedFields.settlementLabel ?? base.settlementLabel ?? null,
          allowPartialPayments: allowedFields.allowPartialPayments !== undefined ? allowedFields.allowPartialPayments : true,
          minPartialPercent: allowedFields.minPartialPercent !== undefined ? allowedFields.minPartialPercent : 20,
          publicKeyPreview: computedPreview || base.publicKeyPreview || null,
          updatedById: updatedById || null
        }
      });
    } catch { }
  }

  const configs = await getTenantGatewayConfigs(safeTid);
  return configs.find((c) => c.gateway === gw) || { tenantId: safeTid, gateway: gw };
}

async function testGatewayConnectivity(tenantId = 1, gateway = 'PAYSTACK') {
  const gw = String(gateway || '').toUpperCase();
  const configs = await getTenantGatewayConfigs(tenantId, { includeSecrets: true });
  const cfg = configs.find((c) => c.gateway === gw);
  const adapter = getAdapter(gw);

  if (!cfg || !adapter) {
    return { gateway: gw, connected: false, mode: 'UNCONFIGURED', message: `Unsupported gateway ${gw}.` };
  }

  if (gw === GATEWAYS.SANDBOX_PSP) {
    return {
      gateway: gw,
      connected: true,
      mode: 'TEST',
      liveHandsetPromptSupported: false,
      message: 'SANDBOX_PSP is operational for TEST mode simulation. Configure live Paystack or Hubtel keys for real mobile money prompts.'
    };
  }

  if (gw === GATEWAYS.BANK_DIRECT) {
    return {
      gateway: gw,
      connected: Boolean(cfg.bankName && cfg.bankAccountNumber),
      mode: 'LIVE',
      liveHandsetPromptSupported: false,
      message: cfg.bankName && cfg.bankAccountNumber
        ? `Commercial Bank Settlement configured (${cfg.bankName} - ${cfg.bankAccountNumber}).`
        : 'Enter Bank Name and Account Number to enable direct bank transfers.'
    };
  }

  if (!adapter.isConfigured(cfg)) {
    return {
      gateway: gw,
      connected: false,
      mode: cfg.mode || 'TEST',
      liveHandsetPromptSupported: false,
      message:
        gw === GATEWAYS.PAYSTACK
          ? 'Paystack Secret Key is missing. Add your Paystack Secret Key (sk_live_... or sk_test_...) in Payment Gateways configuration or server environment variables.'
          : 'Hubtel Client ID, Client Secret, and Merchant Account Number are required.'
    };
  }

  if (gw === GATEWAYS.PAYSTACK) {
    try {
      const res = await adapter._request('GET', '/bank?country=ghana&perPage=1', null, cfg);
      const isLiveKey = String(cfg.secretKey || '').startsWith('sk_live_');
      return {
        gateway: gw,
        connected: Boolean(res),
        mode: isLiveKey ? 'LIVE' : 'TEST',
        liveHandsetPromptSupported: true,
        message: isLiveKey
          ? 'Paystack LIVE API connected! Any valid MTN MoMo, Telecel Cash, AirtelTigo, or Card payer will receive a live carrier approval prompt.'
          : 'Paystack TEST API connected cleanly. Switch Secret Key to sk_live_... when ready for real carrier debits.'
      };
    } catch (err) {
      return {
        gateway: gw,
        connected: false,
        mode: cfg.mode || 'TEST',
        liveHandsetPromptSupported: false,
        message: `Paystack API handshake failed: ${err.message}`
      };
    }
  }

  if (gw === GATEWAYS.HUBTEL) {
    try {
      const creds = adapter._getCredentials(cfg);
      const res = await adapter.fetchFn(
        `${adapter.statusBaseUrl}/transactions/${encodeURIComponent(creds.merchantAccountNumber)}/status?clientReference=GBS-HEALTH-PING`,
        {
          method: 'GET',
          headers: { Authorization: adapter._buildAuthHeader(creds), 'Content-Type': 'application/json' }
        }
      );
      if (res.status === 401 || res.status === 403) {
        return {
          gateway: gw,
          connected: false,
          mode: cfg.mode || 'TEST',
          liveHandsetPromptSupported: false,
          message: `Hubtel rejected credentials (HTTP ${res.status}). Check Client ID / Secret.`
        };
      }
      return {
        gateway: gw,
        connected: true,
        mode: cfg.mode || 'LIVE',
        liveHandsetPromptSupported: true,
        message: 'Hubtel Merchant credentials verified cleanly with Hubtel Status API.'
      };
    } catch (err) {
      return {
        gateway: gw,
        connected: false,
        mode: cfg.mode || 'TEST',
        liveHandsetPromptSupported: false,
        message: `Hubtel network check failed: ${err.message}`
      };
    }
  }

  return { gateway: gw, connected: false, mode: cfg.mode, message: 'Unknown gateway.' };
}

async function resolveGatewayAndChannels(tenantId = 1, options = {}) {
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
        scope: options.scope || 'SCHOOL_FEES',
        gateways: ordered.map((g) => ({
          gateway: g.gateway,
          mode: g.mode,
          settlementLabel: g.settlementLabel,
          bankName: g.bankName || null,
          bankAccountName: g.bankAccountName || null,
          bankBranch: g.bankBranch || null,
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
  resolveGatewayAndChannels,
  testGatewayConnectivity
};
