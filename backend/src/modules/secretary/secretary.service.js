'use strict';

const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');
const { isDemoSandboxRequest } = require('../../middleware/demoLimit.middleware');

const VALID_RECORD_TYPES = new Set([
  'VISITOR_LOG',
  'OFFICIAL_LETTER',
  'CIRCULAR',
  'APPOINTMENT',
  'MINUTES'
]);

function getActorName(user = {}) {
  return (
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.name ||
    user.email ||
    'School Secretary'
  );
}

function parseNumericUserId(user = {}) {
  const n = parseInt(user?.id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeRecordType(rt = '') {
  const up = String(rt || 'VISITOR_LOG').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (up.includes('VISITOR')) return 'VISITOR_LOG';
  if (up.includes('LETTER') || up.includes('CERT')) return 'OFFICIAL_LETTER';
  if (up.includes('CIRCULAR') || up.includes('MEMO') || up.includes('NOTICE')) return 'CIRCULAR';
  if (up.includes('APPOINT')) return 'APPOINTMENT';
  if (up.includes('MINUTE')) return 'MINUTES';
  return VALID_RECORD_TYPES.has(up) ? up : 'VISITOR_LOG';
}

async function seedDemoRecordsIfEmpty(req, tid) {
  if (!isDemoSandboxRequest(req) || tid !== 1) return;
  const count = await prisma.secretaryRecord.count({ where: { tenantId: tid } }).catch(() => 0);
  if (count > 0) return;

  const samples = [
    {
      id: `SEC-${tid}-VIS-1`,
      referenceCode: 'VIS-2026-101',
      recordType: 'VISITOR_LOG',
      title: 'Parent Guardian Front-Desk Visit — Mr. Kwame Mensah',
      counterpartyName: 'Mr. Kwame Mensah',
      counterpartyRole: 'Parent / Guardian',
      phone: '+233 24 555 0144',
      purpose: 'Requested Term 1 progress report and stationery booklist confirmation',
      status: 'CHECKED_IN',
      checkedInAt: new Date()
    },
    {
      id: `SEC-${tid}-LTR-2`,
      referenceCode: 'LTR-2026-204',
      recordType: 'CIRCULAR',
      title: 'Mid-Term PTA & Academic Review Notice',
      subject: 'Official Term Calendar & Stationery Pickup Guidelines',
      counterpartyName: 'All Parents & Teaching Faculty',
      targetAudience: 'ALL_PARENTS',
      content: 'Parents are kindly notified that approved school textbooks, cardigans, socks, and bags are available at official Headmaster-approved prices at the School Secretariat.',
      status: 'SENT'
    },
    {
      id: `SEC-${tid}-APT-3`,
      referenceCode: 'APT-2026-309',
      recordType: 'APPOINTMENT',
      title: 'Headmaster Weekly Department Heads Briefing',
      counterpartyName: 'Headmaster & Academic Heads',
      targetAudience: 'HEADMASTER',
      purpose: 'Review weekly teacher attendance, exam proctoring readiness, and school stationery inventory',
      scheduledAt: new Date(Date.now() + 86400000),
      status: 'SCHEDULED'
    }
  ];

  for (const s of samples) {
    await prisma.secretaryRecord.create({
      data: {
        ...s,
        tenantId: tid,
        handledByName: 'Evelyn Secretary'
      }
    }).catch(() => { });
  }
}

async function getOverview(req) {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  await seedDemoRecordsIfEmpty(req, tid);

  const [records, stationeryTxns, stationeryItems] = await Promise.all([
    prisma.secretaryRecord.findMany({ where: { tenantId: tid }, orderBy: { createdAt: 'desc' } }).catch(() => []),
    prisma.stationeryTransaction.findMany({ where: { tenantId: tid }, orderBy: { occurredAt: 'desc' } }).catch(() => []),
    prisma.stationeryItem.findMany({ where: { tenantId: tid, isActive: true } }).catch(() => [])
  ]);

  const activeVisitors = records.filter((r) => r.recordType === 'VISITOR_LOG' && r.status === 'CHECKED_IN').length;
  const totalLetters = records.filter((r) => ['OFFICIAL_LETTER', 'CIRCULAR', 'MINUTES'].includes(r.recordType)).length;
  const upcomingAppointments = records.filter((r) => r.recordType === 'APPOINTMENT' && r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length;
  const pendingStationeryOrders = stationeryTxns.filter((t) => t.transactionType === 'ORDER_REQUEST' && t.paymentStatus === 'PENDING_APPROVAL').length;

  return {
    summary: {
      activeVisitors,
      totalVisitorsLogged: records.filter((r) => r.recordType === 'VISITOR_LOG').length,
      totalLettersAndCirculars: totalLetters,
      upcomingAppointments,
      stationeryItemsCount: stationeryItems.length,
      pendingStationeryOrders
    },
    recentRecords: records.slice(0, 20)
  };
}

async function listRecords(req) {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  await seedDemoRecordsIfEmpty(req, tid);
  const where = { tenantId: tid };
  if (req.query?.recordType && req.query.recordType !== 'ALL') {
    where.recordType = normalizeRecordType(req.query.recordType);
  }
  const records = await prisma.secretaryRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  return { records };
}

async function createRecord(req) {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  const body = req.body || {};
  const recordType = normalizeRecordType(body.recordType || 'VISITOR_LOG');
  const title = String(body.title || body.subject || body.counterpartyName || '').trim();
  if (!title) {
    throw new AppError('Record title or visitor/recipient name is required.', 400);
  }

  const prefix = recordType.slice(0, 3);
  const referenceCode =
    String(body.referenceCode || '').trim() ||
    `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const status =
    body.status ||
    (recordType === 'VISITOR_LOG'
      ? 'CHECKED_IN'
      : recordType === 'APPOINTMENT'
        ? 'SCHEDULED'
        : 'SENT');

  const record = await prisma.secretaryRecord.create({
    data: {
      id: `SEC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: tid,
      referenceCode,
      recordType,
      title,
      subject: body.subject ? String(body.subject).trim() : null,
      counterpartyName: body.counterpartyName ? String(body.counterpartyName).trim() : null,
      counterpartyRole: body.counterpartyRole ? String(body.counterpartyRole).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      email: body.email ? String(body.email).trim().toLowerCase() : null,
      purpose: body.purpose ? String(body.purpose).trim() : null,
      content: body.content ? String(body.content).trim() : null,
      targetAudience: body.targetAudience ? String(body.targetAudience).trim().toUpperCase() : null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      checkedInAt: recordType === 'VISITOR_LOG' ? new Date() : null,
      status,
      handledById: parseNumericUserId(req.user),
      handledByName: getActorName(req.user)
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tid,
      userId: parseNumericUserId(req.user),
      module: 'SECRETARY_FRONT_DESK',
      action: `SECRETARY_${recordType}_CREATED`,
      details: `${getActorName(req.user)} created ${recordType} (${record.referenceCode}): "${record.title}".`,
      ipAddress: '127.0.0.1'
    }
  }).catch(() => { });

  return record;
}

async function updateRecordStatus(req) {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  const id = String(req.params.id || '').trim();
  const body = req.body || {};

  const existing = await prisma.secretaryRecord.findFirst({
    where: { id, tenantId: tid }
  });
  if (!existing) {
    throw new AppError('Secretary record not found.', 404);
  }

  const nextStatus = String(body.status || 'COMPLETED').trim().toUpperCase();
  const updateData = {
    status: nextStatus,
    updatedAt: new Date()
  };
  if (nextStatus === 'CHECKED_OUT' && !existing.checkedOutAt) {
    updateData.checkedOutAt = new Date();
  }
  if (body.content !== undefined) updateData.content = String(body.content);
  if (body.purpose !== undefined) updateData.purpose = String(body.purpose);

  return await prisma.secretaryRecord.update({
    where: { id: existing.id },
    data: updateData
  });
}

async function deleteRecord(req) {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  const id = String(req.params.id || '').trim();

  const existing = await prisma.secretaryRecord.findFirst({
    where: { id, tenantId: tid }
  });
  if (!existing) {
    throw new AppError('Secretary record not found.', 404);
  }

  await prisma.secretaryRecord.delete({ where: { id: existing.id } });

  await prisma.auditLog.create({
    data: {
      tenantId: tid,
      userId: parseNumericUserId(req.user),
      module: 'SECRETARY_FRONT_DESK',
      action: `SECRETARY_${existing.recordType}_DELETED`,
      details: `${getActorName(req.user)} deleted ${existing.recordType} (${existing.referenceCode}): "${existing.title}".`,
      ipAddress: '127.0.0.1'
    }
  }).catch(() => { });

  return { deleted: true, id: existing.id, referenceCode: existing.referenceCode };
}

module.exports = {
  getOverview,
  listRecords,
  createRecord,
  updateRecordStatus,
  deleteRecord
};
