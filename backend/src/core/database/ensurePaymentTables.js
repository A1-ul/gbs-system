'use strict';

const prisma = require('./prisma.client');

let ensuredOnce = false;
let ensurePromise = null;

/**
 * Ensures additive payment-module columns and tables exist on live PostgreSQL
 * databases without dropping or overwriting any existing institutional records.
 */
async function ensurePaymentTables() {
  if (ensuredOnce) return true;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    try {
      if (typeof prisma.isPostgresOnline === 'function') {
        const online = await prisma.isPostgresOnline();
        if (!online) {
          ensuredOnce = true;
          return true;
        }
      }

      const ddlStatements = [
        `ALTER TABLE IF EXISTS payment_transactions ALTER COLUMN "invoiceId" DROP NOT NULL`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "reference" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "providerReference" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "gateway" TEXT DEFAULT 'MANUAL'`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "channel" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "paymentScope" TEXT DEFAULT 'SCHOOL_FEES'`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "studentId" INTEGER`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "studentCode" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "payerUserId" INTEGER`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "payerPhone" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "payerEmail" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "academicYear" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "term" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "feeAccount" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "expectedAmount" DOUBLE PRECISION`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'GHS'`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "authorizationType" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "authorizationUrl" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "ussdInstruction" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "displayMessage" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "subaccountCode" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "merchantAccountNumber" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "reconciledAt" TIMESTAMP(3)`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "accountingPosted" BOOLEAN DEFAULT false`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "failureReason" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "metadataJson" TEXT`,
        `ALTER TABLE IF EXISTS payment_transactions ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`,
        `CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_reference_key ON payment_transactions ("reference") WHERE "reference" IS NOT NULL`,
        `CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_idempotencyKey_key ON payment_transactions ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`,
        `CREATE TABLE IF NOT EXISTS payment_gateway_configs (
          "id" SERIAL PRIMARY KEY,
          "tenantId" INTEGER NOT NULL,
          "gateway" TEXT NOT NULL,
          "mode" TEXT NOT NULL DEFAULT 'TEST',
          "isEnabled" BOOLEAN NOT NULL DEFAULT false,
          "supportsMtnMomo" BOOLEAN NOT NULL DEFAULT false,
          "supportsTelecelCash" BOOLEAN NOT NULL DEFAULT false,
          "supportsAtMoney" BOOLEAN NOT NULL DEFAULT false,
          "supportsVisa" BOOLEAN NOT NULL DEFAULT false,
          "supportsMastercard" BOOLEAN NOT NULL DEFAULT false,
          "supportsBankTransfer" BOOLEAN NOT NULL DEFAULT false,
          "paystackSubaccountCode" TEXT,
          "hubtelMerchantAccount" TEXT,
          "bankName" TEXT,
          "bankAccountNumber" TEXT,
          "bankAccountName" TEXT,
          "bankBranch" TEXT,
          "settlementLabel" TEXT,
          "allowPartialPayments" BOOLEAN NOT NULL DEFAULT true,
          "minPartialPercent" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
          "publicKeyPreview" TEXT,
          "updatedById" INTEGER,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE ("tenantId", "gateway")
        )`,
        `CREATE TABLE IF NOT EXISTS payment_webhook_events (
          "id" SERIAL PRIMARY KEY,
          "gateway" TEXT NOT NULL,
          "eventId" TEXT,
          "eventType" TEXT NOT NULL,
          "transactionRef" TEXT,
          "providerReference" TEXT,
          "signatureValid" BOOLEAN NOT NULL DEFAULT false,
          "processingStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
          "retryCount" INTEGER NOT NULL DEFAULT 0,
          "nextRetryAt" TIMESTAMP(3),
          "errorMessage" TEXT,
          "payloadHash" TEXT,
          "rawPayload" TEXT,
          "processedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS payment_receipts (
          "id" SERIAL PRIMARY KEY,
          "tenantId" INTEGER NOT NULL,
          "paymentTransactionId" INTEGER NOT NULL UNIQUE,
          "invoiceId" INTEGER,
          "studentId" INTEGER,
          "studentCode" TEXT,
          "studentName" TEXT NOT NULL,
          "institutionName" TEXT NOT NULL,
          "receiptNumber" TEXT NOT NULL,
          "transactionRef" TEXT NOT NULL,
          "providerReference" TEXT,
          "gateway" TEXT NOT NULL,
          "channel" TEXT NOT NULL,
          "amountPaid" DOUBLE PRECISION NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'GHS',
          "balanceBefore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
          "balanceAfter" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
          "academicYear" TEXT,
          "term" TEXT,
          "feeDescription" TEXT,
          "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "metadataJson" TEXT,
          UNIQUE ("tenantId", "receiptNumber")
        )`
      ];

      for (const sql of ddlStatements) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch (err) {
          // Non-fatal in offline JSON mode or if column constraint already matches
          if (process.env.NODE_ENV !== 'test') {
            console.warn('[PAYMENT SCHEMA SYNC NOTICE]', err.message);
          }
        }
      }

      ensuredOnce = true;
      return true;
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}

module.exports = { ensurePaymentTables };
