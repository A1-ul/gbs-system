'use strict';

const paymentsService = require('./payments.service');
const { setSocketIo } = require('./payments.reconciler');
const { TRANSACTION_STATES, GATEWAYS } = require('./payments.constants');
const prisma = require('../../core/database/prisma.client');

function bindIo(req) {
  const io = req.app && typeof req.app.get === 'function' ? req.app.get('io') : null;
  if (io) setSocketIo(io);
}

function getTenantIdFromReq(req) {
  return req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || req.query.tenantId || 1;
}

function getOriginUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  if (host) return `${proto}://${host}`;
  return '';
}

async function getStatus(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: {
        module: 'payments',
        status: 'OPERATIONAL',
        supportedGateways: Object.values(GATEWAYS),
        states: Object.values(TRANSACTION_STATES),
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function getAvailableGateways(req, res, next) {
  try {
    bindIo(req);
    const tenantId = getTenantIdFromReq(req);
    const result = await paymentsService.resolveGatewayAndChannels(tenantId);
    const safeConfigs = result.configs.map((c) => ({
      gateway: c.gateway,
      mode: c.mode,
      isEnabled: c.isEnabled,
      effectiveEnabled: c.effectiveEnabled,
      supportedChannels: c.supportedChannels,
      settlementLabel: c.settlementLabel,
      allowPartialPayments: c.allowPartialPayments,
      minPartialPercent: c.minPartialPercent,
      publicKeyPreview: c.publicKeyPreview,
      capabilities: c.capabilities
    }));
    return res.status(200).json({
      success: true,
      data: {
        tenantId: parseInt(tenantId, 10) || 1,
        channels: result.channels,
        gateways: safeConfigs
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function getStudentFeeStatement(req, res, next) {
  try {
    bindIo(req);
    const tenantId = getTenantIdFromReq(req);
    const studentIdentifier = req.query.studentId || req.query.studentCode || req.params.studentId || null;
    const data = await paymentsService.getStudentFeeStatement({
      tenantId,
      studentIdentifier,
      requestingUser: req.user
    });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    return next(err);
  }
}

async function initiatePayment(req, res, next) {
  try {
    bindIo(req);
    const tenantId = getTenantIdFromReq(req);
    const result = await paymentsService.initiatePayment({
      tenantId,
      requestingUser: req.user,
      body: req.body,
      originUrl: getOriginUrl(req)
    });
    const statusCode = result.error ? 402 : 201;
    return res.status(statusCode).json({
      success: !result.error,
      data: result
    });
  } catch (err) {
    return next(err);
  }
}

async function initiateOnboardingSubscriptionPayment(req, res, next) {
  try {
    bindIo(req);
    const tenantId = req.body.tenantId || req.body.tenantCode || 1;
    const result = await paymentsService.initiatePayment({
      tenantId,
      requestingUser: null,
      body: {
        ...req.body,
        paymentScope: 'SUBSCRIPTION'
      },
      originUrl: getOriginUrl(req)
    });
    const statusCode = result.error ? 402 : 201;
    return res.status(statusCode).json({
      success: !result.error,
      data: result
    });
  } catch (err) {
    return next(err);
  }
}

async function submitAuthorizationStep(req, res, next) {
  try {
    bindIo(req);
    const tenantId = getTenantIdFromReq(req);
    const data = await paymentsService.submitAuthorizationStep({
      tenantId,
      reference: req.params.reference,
      otp: req.body.otp,
      requestingUser: req.user
    });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function switchToFallbackMethod(req, res, next) {
  try {
    bindIo(req);
    const tenantId = getTenantIdFromReq(req);
    const data = await paymentsService.switchToFallbackMethod({
      tenantId,
      reference: req.params.reference,
      newGateway: req.body.gateway,
      newChannel: req.body.channel,
      preferHostedCheckout: req.body.preferHostedCheckout,
      payerPhone: req.body.payerPhone,
      requestingUser: req.user,
      originUrl: getOriginUrl(req)
    });
    return res.status(201).json({ success: !data.error, data });
  } catch (err) {
    return next(err);
  }
}

async function cancelPayment(req, res, next) {
  try {
    bindIo(req);
    const tenantId = getTenantIdFromReq(req);
    const data = await paymentsService.cancelPayment({
      tenantId,
      reference: req.params.reference,
      requestingUser: req.user
    });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function verifyTransaction(req, res, next) {
  try {
    bindIo(req);
    const tenantId = getTenantIdFromReq(req);
    const data = await paymentsService.verifyTransactionStatus({
      tenantId,
      reference: req.params.reference,
      userId: req.user?.id
    });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function verifyOnboardingTransaction(req, res, next) {
  try {
    bindIo(req);
    const data = await paymentsService.verifyTransactionStatus({
      tenantId: null,
      reference: req.params.reference
    });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getTransactionStatus(req, res, next) {
  try {
    bindIo(req);
    const tenantId = getTenantIdFromReq(req);
    const tx = await prisma.paymentTransaction.findFirst({
      where: {
        tenantId: parseInt(tenantId, 10) || 1,
        reference: req.params.reference
      }
    });
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction reference not found.' });
    }
    const receipt = tx.gatewayStatus === TRANSACTION_STATES.SUCCESSFUL
      ? await prisma.paymentReceipt.findFirst({ where: { paymentTransactionId: tx.id } }).catch(() => null)
      : null;

    return res.status(200).json({
      success: true,
      data: { transaction: tx, receipt }
    });
  } catch (err) {
    return next(err);
  }
}

async function listTransactions(req, res, next) {
  try {
    const tenantId = req.user?.role === 'DEVELOPER' && req.query.allTenants === 'true'
      ? 'ALL'
      : getTenantIdFromReq(req);
    const studentId = req.user?.role === 'STUDENT' ? req.user.id : req.query.studentId;
    const transactions = await paymentsService.listTransactions({
      tenantId,
      studentId,
      status: req.query.status,
      gateway: req.query.gateway,
      scope: req.query.scope
    });
    return res.status(200).json({
      success: true,
      results: transactions.length,
      data: { transactions }
    });
  } catch (err) {
    return next(err);
  }
}

async function getReceipt(req, res, next) {
  try {
    const tenantId = getTenantIdFromReq(req);
    const receipt = await paymentsService.getReceipt({
      tenantId,
      receiptOrRef: req.params.receiptOrRef
    });
    return res.status(200).json({ success: true, data: { receipt } });
  } catch (err) {
    return next(err);
  }
}

async function receiveWebhook(req, res, next) {
  try {
    bindIo(req);
    const gatewayParam = String(req.params.gateway || '').toUpperCase();
    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    const result = await paymentsService.handleWebhook({
      gateway: gatewayParam,
      rawBody,
      headers: req.headers,
      payload: req.body
    });
    return res.status(200).json({ received: true, ...result });
  } catch (err) {
    return next(err);
  }
}

async function getFinancialReports(req, res, next) {
  try {
    const tenantId = getTenantIdFromReq(req);
    const report = await paymentsService.getFinancialReports(tenantId, req.query);
    return res.status(200).json({ success: true, data: report });
  } catch (err) {
    return next(err);
  }
}

async function adminAction(req, res, next) {
  try {
    bindIo(req);
    const tenantId = getTenantIdFromReq(req);
    const result = await paymentsService.adminManualOrBankReconcile({
      tenantId,
      reference: req.params.reference,
      action: req.body.action,
      reason: req.body.reason,
      actorUserId: req.user?.id
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

async function reconcilePending(req, res, next) {
  try {
    bindIo(req);
    const tenantId = req.user?.role === 'DEVELOPER' && req.body?.allTenants ? null : getTenantIdFromReq(req);
    const data = await paymentsService.reconcilePendingTransactions(tenantId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function retryWebhooks(req, res, next) {
  try {
    bindIo(req);
    const results = await paymentsService.retryFailedWebhooks();
    return res.status(200).json({ success: true, data: { retried: results.length, results } });
  } catch (err) {
    return next(err);
  }
}

async function getAdminOverview(req, res, next) {
  try {
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId, 10) : (req.user?.role === 'DEVELOPER' ? null : getTenantIdFromReq(req));
    const data = await paymentsService.getAdminOverview(tenantId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function updateGatewayConfig(req, res, next) {
  try {
    const targetTenantId = req.body.tenantId !== undefined ? req.body.tenantId : getTenantIdFromReq(req);
    const updated = await paymentsService.upsertTenantGatewayConfig(
      targetTenantId,
      req.params.gateway,
      req.body,
      req.user?.id
    );
    return res.status(200).json({
      success: true,
      message: `${req.params.gateway} configuration saved securely (API secret keys remain managed via server environment variables).`,
      data: { config: updated }
    });
  } catch (err) {
    return next(err);
  }
}

async function triggerSandboxWebhook(req, res, next) {
  try {
    bindIo(req);
    const data = await paymentsService.triggerSandboxConfirmation({
      reference: req.params.reference,
      outcome: req.body.outcome || 'SUCCESSFUL'
    });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function renderSandboxCheckoutPage(req, res) {
  const reference = req.params.reference;
  const tx = await prisma.paymentTransaction.findFirst({ where: { reference } }).catch(() => null);
  if (!tx || tx.gateway !== GATEWAYS.SANDBOX_PSP) {
    return res.status(404).send('<h2>Sandbox checkout session not found or not in Test Mode.</h2>');
  }
  const safeRef = String(tx.reference).replace(/[<>&"']/g, '');
  const safeAmt = Number(tx.expectedAmount || tx.amountPaid || 0).toFixed(2);
  const safeCur = String(tx.currency || 'GHS').replace(/[<>&"']/g, '');
  const returnBase = req.query.returnUrl ? String(req.query.returnUrl) : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>GBS Official Payment Sandbox Checkout</title>
<style>
  body { font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .card { background: #1e293b; border: 1px solid #38bdf8; border-radius: 16px; max-width: 440px; width: 100%; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,.5); }
  .badge { background: #f59e0b; color: #0f172a; font-weight: bold; padding: 4px 10px; border-radius: 999px; font-size: 12px; display: inline-block; margin-bottom: 12px; }
  .amt { font-size: 28px; font-weight: 800; color: #34d399; margin: 8px 0; }
  .meta { font-size: 13px; color: #cbd5e1; margin-bottom: 16px; line-height: 1.5; }
  .btn { width: 100%; padding: 12px; border: none; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; margin-top: 8px; }
  .ok { background: #10b981; color: #fff; }
  .fail { background: #ef4444; color: #fff; }
  .cancel { background: #475569; color: #fff; }
</style>
</head>
<body>
  <div class="card">
    <span class="badge">TEST / SANDBOX MODE — NO REAL MONEY CHARGED</span>
    <h2 style="margin:0 0 6px;">Hosted Gateway Sandbox Checkout</h2>
    <div class="amt">${safeCur} ${safeAmt}</div>
    <div class="meta">
      Reference: <strong>${safeRef}</strong><br/>
      Channel: <strong>${tx.channel}</strong><br/>
      Completing here sends an HMAC-signed webhook to GBS backend. Never trusts browser redirect alone.
    </div>
    <button class="btn ok" onclick="act('SUCCESSFUL')">Approve Payment (Trigger Signed Success Webhook)</button>
    <button class="btn fail" onclick="act('FAILED')">Simulate Declined / Insufficient Funds</button>
    <button class="btn cancel" onclick="act('CANCELLED')">Cancel and Return to GBS</button>
    <p id="msg" style="font-size:13px;color:#fbbf24;margin-top:12px;"></p>
  </div>
<script>
async function act(outcome) {
  document.getElementById('msg').textContent = 'Sending signed webhook notification...';
  const res = await fetch('/api/v1/payments/sandbox-checkout/${safeRef}/complete', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ outcome })
  });
  const data = await res.json();
  document.getElementById('msg').textContent = 'Webhook status: ' + (data?.data?.transactionStatus || data?.data?.status || 'DONE');
  const ret = ${JSON.stringify(returnBase)};
  if (ret) {
    setTimeout(() => { window.location.href = ret; }, 600);
  }
}
</script>
</body>
</html>`;
  return res.status(200).type('html').send(html);
}

module.exports = {
  getStatus,
  getAvailableGateways,
  getStudentFeeStatement,
  initiatePayment,
  initiateOnboardingSubscriptionPayment,
  submitAuthorizationStep,
  switchToFallbackMethod,
  cancelPayment,
  verifyTransaction,
  verifyOnboardingTransaction,
  getTransactionStatus,
  listTransactions,
  getReceipt,
  receiveWebhook,
  getFinancialReports,
  adminAction,
  reconcilePending,
  retryWebhooks,
  getAdminOverview,
  updateGatewayConfig,
  triggerSandboxWebhook,
  renderSandboxCheckoutPage
};
