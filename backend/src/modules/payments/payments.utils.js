'use strict';

const crypto = require('crypto');

/**
 * Normalizes a Ghanaian MSISDN phone number to local 10-digit (0XXXXXXXXX)
 * and E.164 international format (+233XXXXXXXXX / 233XXXXXXXXX).
 */
function normalizeGhanaPhone(rawPhone) {
  const cleaned = String(rawPhone || '').replace(/[\s\-().]/g, '');
  if (!cleaned) return { valid: false, error: 'Mobile money phone number is required.' };

  let local = cleaned;
  if (local.startsWith('+233')) {
    local = '0' + local.slice(4);
  } else if (local.startsWith('233') && local.length === 12) {
    local = '0' + local.slice(3);
  } else if (local.startsWith('00233')) {
    local = '0' + local.slice(5);
  }

  if (!/^0[235][0-9]{8}$/.test(local)) {
    return {
      valid: false,
      error: 'Enter a valid 10-digit Ghana phone number (e.g. 024XXXXXXX, 055XXXXXXX, 020XXXXXXX, or 027XXXXXXX).'
    };
  }

  const prefix = local.slice(0, 3);
  let detectedNetwork = 'OTHER';
  if (['024', '025', '053', '054', '055', '059'].includes(prefix)) {
    detectedNetwork = 'MTN_MOMO';
  } else if (['020', '050'].includes(prefix)) {
    detectedNetwork = 'TELECEL_CASH';
  } else if (['026', '027', '056', '057'].includes(prefix)) {
    detectedNetwork = 'AT_MONEY';
  }

  return {
    valid: true,
    local,
    international: '233' + local.slice(1),
    e164: '+233' + local.slice(1),
    masked: maskPhone(local),
    detectedNetwork
  };
}

function maskPhone(phone) {
  const str = String(phone || '').trim();
  if (str.length <= 6) return '***';
  return `${str.slice(0, 3)}***${str.slice(-4)}`;
}

function maskSecretPreview(secret) {
  if (!secret || typeof secret !== 'string') return null;
  const trimmed = secret.trim();
  if (trimmed.length < 8) return '****';
  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`;
}

function generateTransactionReference(tenantId = 1, scope = 'FEE') {
  const safeTid = parseInt(tenantId, 10) || 1;
  const prefix = scope === 'SUBSCRIPTION' ? 'SUB' : 'FEE';
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `GBS-${prefix}-${safeTid}-${datePart}-${randPart}`;
}

function generateReceiptNumber(tenantId = 1) {
  const safeTid = parseInt(tenantId, 10) || 1;
  const year = new Date().getFullYear();
  const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `RCP-${year}-T${safeTid}-${randPart}`;
}

function roundMoney(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function timingSafeEqualsHex(a, b) {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(String(a).trim(), 'utf8');
    const bufB = Buffer.from(String(b).trim(), 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

module.exports = {
  normalizeGhanaPhone,
  maskPhone,
  maskSecretPreview,
  generateTransactionReference,
  generateReceiptNumber,
  roundMoney,
  sha256Hex,
  timingSafeEqualsHex
};
