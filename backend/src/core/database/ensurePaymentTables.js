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
        `ALTER TABLE IF EXISTS payment_gateway_configs ADD COLUMN IF NOT EXISTS "paystackPublicKey" TEXT`,
        `ALTER TABLE IF EXISTS payment_gateway_configs ADD COLUMN IF NOT EXISTS "paystackSecretKeyEnc" TEXT`,
        `ALTER TABLE IF EXISTS payment_gateway_configs ADD COLUMN IF NOT EXISTS "paystackWebhookSecretEnc" TEXT`,
        `ALTER TABLE IF EXISTS payment_gateway_configs ADD COLUMN IF NOT EXISTS "hubtelClientId" TEXT`,
        `ALTER TABLE IF EXISTS payment_gateway_configs ADD COLUMN IF NOT EXISTS "hubtelClientSecretEnc" TEXT`,
        `ALTER TABLE IF EXISTS payment_gateway_configs ADD COLUMN IF NOT EXISTS "hubtelWebhookSecretEnc" TEXT`,
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
        )`,
        `CREATE TABLE IF NOT EXISTS tenant_attendance_policies (
          "id" SERIAL PRIMARY KEY,
          "tenantId" INTEGER NOT NULL UNIQUE,
          "closingTime" TEXT NOT NULL DEFAULT '16:00',
          "lateCutoffTime" TEXT NOT NULL DEFAULT '08:15',
          "autoClockOutDelayMinutes" INTEGER NOT NULL DEFAULT 120,
          "activeTerm" TEXT NOT NULL DEFAULT 'Term 1 (2026/2027)',
          "academicYear" TEXT NOT NULL DEFAULT '2026-2027',
          "enforceClockOutReasonBeforeClose" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS staff_attendance_records (
          "id" TEXT PRIMARY KEY,
          "tenantId" INTEGER NOT NULL,
          "staffId" TEXT NOT NULL,
          "staffName" TEXT NOT NULL,
          "staffEmail" TEXT,
          "staffRole" TEXT NOT NULL,
          "designation" TEXT,
          "department" TEXT,
          "isClinicStaff" BOOLEAN NOT NULL DEFAULT false,
          "termLabel" TEXT,
          "academicYear" TEXT,
          "shiftDate" TEXT NOT NULL,
          "clockInAt" TIMESTAMP(3),
          "clockOutAt" TIMESTAMP(3),
          "scheduledCloseAt" TIMESTAMP(3),
          "durationMinutes" INTEGER,
          "hoursWorkedLabel" TEXT,
          "clockInNote" TEXT,
          "clockOutNote" TEXT,
          "clockOutReason" TEXT,
          "bypassedClockIn" BOOLEAN NOT NULL DEFAULT false,
          "markedPresent" BOOLEAN NOT NULL DEFAULT true,
          "autoClockOut" BOOLEAN NOT NULL DEFAULT false,
          "lateFlag" BOOLEAN NOT NULL DEFAULT false,
          "status" TEXT NOT NULL DEFAULT 'CLOCKED_IN',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_staff_att_tenant_date ON staff_attendance_records ("tenantId", "shiftDate")`,
        `CREATE INDEX IF NOT EXISTS idx_staff_att_tenant_term ON staff_attendance_records ("tenantId", "termLabel", "status")`,
        `CREATE TABLE IF NOT EXISTS live_call_sessions (
          "id" TEXT PRIMARY KEY,
          "tenantId" INTEGER NOT NULL,
          "roomCode" TEXT NOT NULL,
          "callScope" TEXT NOT NULL DEFAULT 'DIRECT',
          "mediaMode" TEXT NOT NULL DEFAULT 'VIDEO',
          "title" TEXT NOT NULL,
          "initiatorUserId" TEXT NOT NULL,
          "initiatorName" TEXT NOT NULL,
          "initiatorRole" TEXT NOT NULL,
          "targetUserId" TEXT,
          "targetName" TEXT,
          "targetRole" TEXT,
          "status" TEXT NOT NULL DEFAULT 'RINGING',
          "participantsJson" TEXT,
          "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "answeredAt" TIMESTAMP(3),
          "endedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_live_calls_tenant_status ON live_call_sessions ("tenantId", "status")`,
        `CREATE INDEX IF NOT EXISTS idx_live_calls_tenant_room ON live_call_sessions ("tenantId", "roomCode")`,
        `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SECRETARY'`,
        `CREATE TABLE IF NOT EXISTS stationery_items (
          "id" TEXT PRIMARY KEY,
          "tenantId" INTEGER NOT NULL,
          "itemCode" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "description" TEXT,
          "unitPrice" DOUBLE PRECISION NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'GHS',
          "stockQty" INTEGER NOT NULL DEFAULT 0,
          "reorderLevel" INTEGER NOT NULL DEFAULT 10,
          "unitLabel" TEXT NOT NULL DEFAULT 'Piece',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "priceLockedByRole" TEXT NOT NULL DEFAULT 'ADMIN',
          "priceUpdatedByName" TEXT,
          "priceUpdatedByRole" TEXT,
          "priceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE ("tenantId", "itemCode")
        )`,
        `CREATE INDEX IF NOT EXISTS idx_stationery_items_tenant ON stationery_items ("tenantId", "category", "isActive")`,
        `CREATE TABLE IF NOT EXISTS stationery_transactions (
          "id" TEXT PRIMARY KEY,
          "tenantId" INTEGER NOT NULL,
          "referenceNumber" TEXT NOT NULL,
          "transactionType" TEXT NOT NULL,
          "itemId" TEXT,
          "itemName" TEXT NOT NULL,
          "category" TEXT,
          "quantity" INTEGER NOT NULL DEFAULT 1,
          "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
          "totalAmount" DOUBLE PRECISION NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'GHS',
          "buyerName" TEXT,
          "buyerRole" TEXT,
          "buyerClass" TEXT,
          "vendorName" TEXT,
          "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
          "recordedById" INTEGER,
          "recordedByName" TEXT,
          "recordedByRole" TEXT,
          "linkedExpenseId" INTEGER,
          "linkedExpenseNumber" TEXT,
          "notes" TEXT,
          "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_stationery_txn_tenant ON stationery_transactions ("tenantId", "transactionType", "occurredAt")`,
        `CREATE TABLE IF NOT EXISTS secretary_records (
          "id" TEXT PRIMARY KEY,
          "tenantId" INTEGER NOT NULL,
          "referenceCode" TEXT NOT NULL,
          "recordType" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "subject" TEXT,
          "counterpartyName" TEXT,
          "counterpartyRole" TEXT,
          "phone" TEXT,
          "email" TEXT,
          "purpose" TEXT,
          "content" TEXT,
          "targetAudience" TEXT,
          "scheduledAt" TIMESTAMP(3),
          "checkedInAt" TIMESTAMP(3),
          "checkedOutAt" TIMESTAMP(3),
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "handledById" INTEGER,
          "handledByName" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_secretary_records_tenant ON secretary_records ("tenantId", "recordType", "status")`
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
