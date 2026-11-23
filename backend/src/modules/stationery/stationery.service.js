'use strict';

const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');
const { isDemoSandboxRequest } = require('../../middleware/demoLimit.middleware');
const financeService = require('../finance/finance.service');

const HEADMASTER_PRICE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL']);

const VALID_CATEGORIES = new Set([
  'TEXTBOOK',
  'CARDIGAN',
  'SOCKS',
  'SCHOOL_BAG',
  'EXERCISE_BOOK',
  'UNIFORM',
  'STATIONERY',
  'OTHER'
]);

function normalizeRole(role = '') {
  return String(role || '').trim().toUpperCase();
}

function assertHeadmasterPriceAuthority(user = {}) {
  const role = normalizeRole(user.role);
  if (!HEADMASTER_PRICE_ROLES.has(role)) {
    throw new AppError(
      'Access Denied: Strictly ONLY the Institution Headmaster has authority to set or edit school stationery prices.',
      403
    );
  }
}

function getActorDisplayName(user = {}) {
  return (
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.name ||
    user.email ||
    'School Official'
  );
}

function parseNumericUserId(user = {}) {
  const n = parseInt(user?.id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeCategory(cat = '') {
  const upper = String(cat || 'OTHER')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (upper.includes('TEXT')) return 'TEXTBOOK';
  if (upper.includes('CARDIGAN') || upper.includes('SWEATER')) return 'CARDIGAN';
  if (upper.includes('SOCK')) return 'SOCKS';
  if (upper.includes('BAG') || upper.includes('BACKPACK')) return 'SCHOOL_BAG';
  if (upper.includes('EXERCISE') || upper.includes('NOTEBOOK') || upper.includes('BOOK')) return 'EXERCISE_BOOK';
  if (upper.includes('UNIFORM')) return 'UNIFORM';
  if (VALID_CATEGORIES.has(upper)) return upper;
  return 'OTHER';
}

function normalizeTargetClass(value) {
  const clean = String(value || '').trim();
  if (!clean || clean.toUpperCase() === 'ALL' || clean.toUpperCase() === 'ALL_CLASSES' || clean.toUpperCase() === 'GENERAL') {
    return 'ALL_CLASSES';
  }
  return clean;
}

function sanitizeClassPricing(input) {
  if (!input) return {};
  let raw = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  const map = {};
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue;
      const cls = String(entry.className || entry.classLevel || entry.level || entry.class || '').trim();
      const price = Number(entry.unitPrice ?? entry.price);
      if (cls && cls.toUpperCase() !== 'ALL_CLASSES' && Number.isFinite(price) && price >= 0) {
        map[cls] = Math.round(price * 100) / 100;
      }
    }
    return map;
  }
  if (typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      const cls = String(k || '').trim();
      const price = Number(v);
      if (cls && cls.toUpperCase() !== 'ALL_CLASSES' && Number.isFinite(price) && price >= 0) {
        map[cls] = Math.round(price * 100) / 100;
      }
    }
  }
  return map;
}

function hydrateStationeryItem(item) {
  if (!item) return item;
  const classPricing = sanitizeClassPricing(item.classPricingJson || item.classPricing);
  const targetClass = normalizeTargetClass(item.targetClass);
  return {
    ...item,
    targetClass,
    classPricing
  };
}

function resolveAuthoritativePriceForClass(item, buyerClass) {
  const hydrated = hydrateStationeryItem(item);
  const cleanBuyer = String(buyerClass || '').trim().toLowerCase();
  if (cleanBuyer && hydrated.classPricing && Object.keys(hydrated.classPricing).length > 0) {
    for (const [clsName, clsPrice] of Object.entries(hydrated.classPricing)) {
      if (String(clsName).trim().toLowerCase() === cleanBuyer) {
        return Number(clsPrice);
      }
    }
  }
  return Number(hydrated.unitPrice) || 0;
}

function matchesClassFilter(hydratedItem, requestedClass) {
  const cleanReq = String(requestedClass || '').trim().toLowerCase();
  if (!cleanReq || cleanReq === 'all' || cleanReq === 'all_classes') return true;
  if (String(hydratedItem.targetClass || 'ALL_CLASSES').toUpperCase() === 'ALL_CLASSES') return true;
  if (String(hydratedItem.targetClass || '').trim().toLowerCase() === cleanReq) return true;
  if (hydratedItem.classPricing && Object.keys(hydratedItem.classPricing).some((k) => k.trim().toLowerCase() === cleanReq)) {
    return true;
  }
  return false;
}

async function ensureDemoStarterItemsIfDemo(req, tid) {
  if (!isDemoSandboxRequest(req) || tid !== 1) return [];
  const existing = await prisma.stationeryItem.findMany({
    where: { tenantId: tid }
  }).catch(() => []);
  if (existing && existing.length > 0) return existing;

  const starterCatalog = [
    {
      itemCode: 'STN-TXT-001',
      name: 'Core Mathematics & Integrated Science Textbook Set',
      category: 'TEXTBOOK',
      description: 'Approved term textbook bundle priced respectfully by class level.',
      unitPrice: 85.0,
      targetClass: 'ALL_CLASSES',
      classPricing: {
        'Primary 1': 55.0,
        'Primary 4': 65.0,
        'JHS 1': 85.0,
        'SHS 1': 120.0
      },
      stockQty: 120,
      reorderLevel: 20,
      unitLabel: 'Set'
    },
    {
      itemCode: 'STN-CRD-002',
      name: 'Official GBS Navy Cardigan / Sweater',
      category: 'CARDIGAN',
      description: 'Knitted navy-and-gold school crest cardigan sized and priced by school level.',
      unitPrice: 110.0,
      targetClass: 'ALL_CLASSES',
      classPricing: {
        'Nursery 1': 75.0,
        'Primary 1': 90.0,
        'JHS 1': 110.0,
        'SHS 1': 130.0
      },
      stockQty: 75,
      reorderLevel: 15,
      unitLabel: 'Piece'
    },
    {
      itemCode: 'STN-SCK-003',
      name: 'Branded School Cotton Socks (Pair)',
      category: 'SOCKS',
      description: 'Heavy-duty breathable cotton striped school socks in institutional colors.',
      unitPrice: 18.0,
      targetClass: 'ALL_CLASSES',
      classPricing: {
        'Primary 1': 15.0,
        'JHS 1': 18.0,
        'SHS 1': 22.0
      },
      stockQty: 200,
      reorderLevel: 30,
      unitLabel: 'Pair'
    },
    {
      itemCode: 'STN-BAG-004',
      name: 'Reinforced GBS Crest School Backpack',
      category: 'SCHOOL_BAG',
      description: 'Water-resistant multi-compartment school backpack with embroidered institutional crest.',
      unitPrice: 145.0,
      targetClass: 'ALL_CLASSES',
      classPricing: {
        'Primary 1': 115.0,
        'JHS 1': 145.0,
        'SHS 1': 165.0
      },
      stockQty: 60,
      reorderLevel: 12,
      unitLabel: 'Bag'
    },
    {
      itemCode: 'STN-EXB-005',
      name: 'GBS Custom Exercise Books (Pack of 10)',
      category: 'EXERCISE_BOOK',
      description: '80-leaf ruled institutional exercise books stamped with official school crest.',
      unitPrice: 45.0,
      targetClass: 'ALL_CLASSES',
      classPricing: {
        'Primary 1': 35.0,
        'JHS 1': 45.0,
        'SHS 1': 55.0
      },
      stockQty: 250,
      reorderLevel: 40,
      unitLabel: 'Pack'
    },
    {
      itemCode: 'STN-UNI-006',
      name: 'Official School Ceremonial Uniform Set',
      category: 'UNIFORM',
      description: 'Complete tailored school uniform set approved by the Headmaster by level.',
      unitPrice: 180.0,
      targetClass: 'ALL_CLASSES',
      classPricing: {
        'Primary 1': 140.0,
        'JHS 1': 180.0,
        'SHS 1': 210.0
      },
      stockQty: 50,
      reorderLevel: 10,
      unitLabel: 'Set'
    }
  ];

  const created = [];
  for (const s of starterCatalog) {
    try {
      const row = await prisma.stationeryItem.create({
        data: {
          id: `STN-${tid}-${s.itemCode}`,
          tenantId: tid,
          itemCode: s.itemCode,
          name: s.name,
          category: s.category,
          description: s.description,
          unitPrice: s.unitPrice,
          currency: 'GHS',
          targetClass: s.targetClass || 'ALL_CLASSES',
          classPricingJson: s.classPricing ? JSON.stringify(s.classPricing) : null,
          stockQty: s.stockQty,
          reorderLevel: s.reorderLevel,
          unitLabel: s.unitLabel,
          isActive: true,
          priceLockedByRole: 'ADMIN',
          priceUpdatedByName: 'Institution Headmaster (Demo)',
          priceUpdatedByRole: 'ADMIN',
          priceUpdatedAt: new Date()
        }
      });
      created.push(row);
    } catch { }
  }
  return created;
}

async function listCatalog(req) {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  await ensureDemoStarterItemsIfDemo(req, tid);

  const includeInactive =
    String(req.query?.includeInactive || '').toLowerCase() === 'true' &&
    HEADMASTER_PRICE_ROLES.has(normalizeRole(req.user?.role));

  const where = { tenantId: tid };
  if (!includeInactive) where.isActive = true;
  if (req.query?.category && req.query.category !== 'ALL') {
    where.category = normalizeCategory(req.query.category);
  }

  const [rawItems, schoolClasses] = await Promise.all([
    prisma.stationeryItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    }),
    prisma.class.findMany({
      where: { tenantId: tid },
      select: { name: true, gradeLevel: true }
    }).catch(() => [])
  ]);

  const requestedClass = String(req.query?.className || req.query?.targetClass || '').trim();
  const hydratedAll = rawItems.map(hydrateStationeryItem);
  const filteredItems = hydratedAll
    .filter((item) => matchesClassFilter(item, requestedClass))
    .map((item) => ({
      ...item,
      effectiveUnitPrice: requestedClass && requestedClass.toUpperCase() !== 'ALL' && requestedClass.toUpperCase() !== 'ALL_CLASSES'
        ? resolveAuthoritativePriceForClass(item, requestedClass)
        : Number(item.unitPrice) || 0
    }));

  const classSet = new Set();
  for (const c of schoolClasses || []) {
    if (c?.name) classSet.add(String(c.name).trim());
    if (c?.gradeLevel) classSet.add(String(c.gradeLevel).trim());
  }
  for (const it of hydratedAll) {
    if (it.targetClass && it.targetClass !== 'ALL_CLASSES') classSet.add(it.targetClass);
    for (const clsKey of Object.keys(it.classPricing || {})) {
      classSet.add(clsKey);
    }
  }

  return {
    items: filteredItems,
    availableClasses: Array.from(classSet).sort(),
    canEditPrices: HEADMASTER_PRICE_ROLES.has(normalizeRole(req.user?.role)),
    priceAuthorityRole: 'HEADMASTER'
  };
}

async function createItem(req) {
  assertHeadmasterPriceAuthority(req.user);
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  const body = req.body || {};

  const name = String(body.name || '').trim();
  const targetClass = normalizeTargetClass(body.targetClass || body.classLevel || body.className);
  const classPricing = sanitizeClassPricing(body.classPricing || body.classPrices || body.classPricingJson);
  const classPriceValues = Object.values(classPricing);

  let unitPrice = body.unitPrice !== undefined && body.unitPrice !== '' && body.unitPrice !== null
    ? Number(body.unitPrice)
    : (classPriceValues.length > 0 ? Number(classPriceValues[0]) : NaN);

  if (!name) {
    throw new AppError('Stationery item name is required.', 400);
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new AppError('A valid unit price (or class-level price) set by the Headmaster is required.', 400);
  }
  unitPrice = Math.round(unitPrice * 100) / 100;

  // If Headmaster selected a specific targetClass and did not add a separate classPricing entry for it, mirror it cleanly
  if (targetClass !== 'ALL_CLASSES' && classPricing[targetClass] === undefined) {
    classPricing[targetClass] = unitPrice;
  }

  const category = normalizeCategory(body.category || 'OTHER');
  const itemCode =
    String(body.itemCode || '').trim().toUpperCase() ||
    `STN-${category.slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const existingCode = await prisma.stationeryItem.findFirst({
    where: { tenantId: tid, itemCode }
  }).catch(() => null);
  if (existingCode) {
    throw new AppError(`Item code "${itemCode}" already exists for this school.`, 400);
  }

  const stockQty = Math.max(0, parseInt(body.stockQty ?? 0, 10) || 0);
  const reorderLevel = Math.max(0, parseInt(body.reorderLevel ?? 10, 10) || 10);
  const classPricingJson = Object.keys(classPricing).length > 0 ? JSON.stringify(classPricing) : null;

  const item = await prisma.stationeryItem.create({
    data: {
      id: `STN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: tid,
      itemCode,
      name,
      category,
      description: body.description ? String(body.description).trim() : null,
      unitPrice,
      currency: String(body.currency || 'GHS').toUpperCase(),
      targetClass,
      classPricingJson,
      stockQty,
      reorderLevel,
      unitLabel: String(body.unitLabel || 'Piece').trim() || 'Piece',
      isActive: body.isActive !== false,
      priceLockedByRole: 'ADMIN',
      priceUpdatedByName: getActorDisplayName(req.user),
      priceUpdatedByRole: normalizeRole(req.user?.role),
      priceUpdatedAt: new Date()
    }
  });

  const hydrated = hydrateStationeryItem(item);
  const classSummary = Object.keys(hydrated.classPricing).length > 0
    ? ` [Class Prices: ${Object.entries(hydrated.classPricing).map(([c, p]) => `${c}=${item.currency} ${Number(p).toFixed(2)}`).join(', ')}]`
    : (hydrated.targetClass !== 'ALL_CLASSES' ? ` [Class: ${hydrated.targetClass}]` : '');

  await prisma.auditLog.create({
    data: {
      tenantId: tid,
      userId: parseNumericUserId(req.user),
      module: 'SCHOOL_STATIONERY',
      action: 'STATIONERY_ITEM_CREATED',
      details: `Headmaster (${getActorDisplayName(req.user)}) published "${item.name}" (${item.category}) at fixed official price ${item.currency} ${item.unitPrice.toFixed(2)}${classSummary}.`,
      ipAddress: '127.0.0.1'
    }
  }).catch(() => { });

  return hydrated;
}

async function updateItem(req) {
  assertHeadmasterPriceAuthority(req.user);
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  const itemId = String(req.params.id || '').trim();
  const body = req.body || {};

  const existing = await prisma.stationeryItem.findFirst({
    where: { id: itemId, tenantId: tid }
  });
  if (!existing) {
    throw new AppError('Stationery item not found in this institution.', 404);
  }

  const updateData = {
    updatedAt: new Date()
  };

  if (body.name !== undefined) {
    const cleanName = String(body.name || '').trim();
    if (!cleanName) throw new AppError('Item name cannot be empty.', 400);
    updateData.name = cleanName;
  }
  if (body.category !== undefined) updateData.category = normalizeCategory(body.category);
  if (body.description !== undefined) updateData.description = String(body.description || '').trim() || null;
  if (body.unitLabel !== undefined) updateData.unitLabel = String(body.unitLabel || 'Piece').trim() || 'Piece';
  if (body.stockQty !== undefined) updateData.stockQty = Math.max(0, parseInt(body.stockQty, 10) || 0);
  if (body.reorderLevel !== undefined) updateData.reorderLevel = Math.max(0, parseInt(body.reorderLevel, 10) || 10);
  if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
  if (body.currency !== undefined) updateData.currency = String(body.currency || 'GHS').toUpperCase();

  let priceMetadataTouched = false;
  if (body.targetClass !== undefined || body.classLevel !== undefined) {
    updateData.targetClass = normalizeTargetClass(body.targetClass ?? body.classLevel);
    priceMetadataTouched = true;
  }
  if (body.classPricing !== undefined || body.classPrices !== undefined || body.classPricingJson !== undefined) {
    const nextClassPricing = sanitizeClassPricing(body.classPricing ?? body.classPrices ?? body.classPricingJson);
    updateData.classPricingJson = Object.keys(nextClassPricing).length > 0 ? JSON.stringify(nextClassPricing) : null;
    priceMetadataTouched = true;
  }

  if (body.unitPrice !== undefined) {
    const nextPrice = Number(body.unitPrice);
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      throw new AppError('Unit price must be a non-negative number.', 400);
    }
    updateData.unitPrice = Math.round(nextPrice * 100) / 100;
    priceMetadataTouched = true;
  }

  if (priceMetadataTouched) {
    updateData.priceUpdatedByName = getActorDisplayName(req.user);
    updateData.priceUpdatedByRole = normalizeRole(req.user?.role);
    updateData.priceUpdatedAt = new Date();
  }

  const updated = await prisma.stationeryItem.update({
    where: { id: existing.id },
    data: updateData
  });

  const hydrated = hydrateStationeryItem(updated);

  await prisma.auditLog.create({
    data: {
      tenantId: tid,
      userId: parseNumericUserId(req.user),
      module: 'SCHOOL_STATIONERY',
      action: 'STATIONERY_PRICE_UPDATED',
      details: `Headmaster (${getActorDisplayName(req.user)}) updated "${hydrated.name}" (${hydrated.targetClass}) base price to ${hydrated.currency} ${Number(hydrated.unitPrice).toFixed(2)} (class tiers: ${Object.keys(hydrated.classPricing).length}, stock: ${hydrated.stockQty}).`,
      ipAddress: '127.0.0.1'
    }
  }).catch(() => { });

  return hydrated;
}

async function recordSaleOrOrder(req) {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  const body = req.body || {};
  const itemId = String(body.itemId || '').trim();
  const qty = Math.max(1, parseInt(body.quantity ?? 1, 10) || 1);
  const role = normalizeRole(req.user?.role);

  const rawItem = await prisma.stationeryItem.findFirst({
    where: { id: itemId, tenantId: tid }
  });
  if (!rawItem) {
    throw new AppError('Selected stationery item was not found in this school catalog.', 404);
  }
  const item = hydrateStationeryItem(rawItem);

  const isStaffRecorder = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'SECRETARY', 'ACCOUNTANT', 'STAFF'].includes(role);
  const txnType = body.orderOnly || !isStaffRecorder ? 'ORDER_REQUEST' : 'SALE';

  const buyerClass = body.buyerClass
    ? String(body.buyerClass).trim()
    : (item.targetClass !== 'ALL_CLASSES' ? item.targetClass : null);

  // Authoritative unitPrice ALWAYS comes from Headmaster's stored class/base catalog price (never from client payload)
  const authoritativeUnitPrice = resolveAuthoritativePriceForClass(item, buyerClass);
  const totalAmount = Math.round(authoritativeUnitPrice * qty * 100) / 100;

  if (txnType === 'SALE' && Number(item.stockQty || 0) < qty) {
    throw new AppError(
      `Insufficient stock for "${item.name}". Available stock: ${item.stockQty} ${item.unitLabel}(s).`,
      400
    );
  }

  let updatedItem = item;
  if (txnType === 'SALE') {
    const rawUpdated = await prisma.stationeryItem.update({
      where: { id: item.id },
      data: {
        stockQty: Math.max(0, Number(item.stockQty || 0) - qty),
        updatedAt: new Date()
      }
    });
    updatedItem = hydrateStationeryItem(rawUpdated);
  }

  const refNum = `STN-SAL-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`;
  const buyerName = String(body.buyerName || getActorDisplayName(req.user)).trim();
  const buyerRole = String(body.buyerRole || role || 'STUDENT').toUpperCase();

  const txn = await prisma.stationeryTransaction.create({
    data: {
      id: `STX-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: tid,
      referenceNumber: refNum,
      transactionType: txnType,
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      quantity: qty,
      unitPrice: authoritativeUnitPrice,
      totalAmount,
      currency: item.currency || 'GHS',
      buyerName,
      buyerRole,
      buyerClass,
      paymentStatus: txnType === 'ORDER_REQUEST' ? 'PENDING_APPROVAL' : (body.paymentStatus || 'PAID'),
      recordedById: parseNumericUserId(req.user),
      recordedByName: getActorDisplayName(req.user),
      recordedByRole: role,
      notes: body.notes ? String(body.notes).trim() : null,
      occurredAt: new Date()
    }
  });

  return {
    transaction: txn,
    updatedItem
  };
}

async function recordExpense(req) {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  const body = req.body || {};
  const role = normalizeRole(req.user?.role);
  const allowedExpenseRecorders = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'SECRETARY', 'ACCOUNTANT', 'STAFF', 'DEVELOPER'];
  if (!allowedExpenseRecorders.includes(role)) {
    throw new AppError('Only authorized school staff (Headmaster, Secretary, Accountant, Storekeeper) may log stationery expenses.', 403);
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('A valid positive expense amount is required.', 400);
  }

  const restockItemId = body.itemId ? String(body.itemId).trim() : null;
  const restockQty = Math.max(0, parseInt(body.quantity ?? 0, 10) || 0);

  let matchedItem = null;
  if (restockItemId) {
    matchedItem = await prisma.stationeryItem.findFirst({
      where: { id: restockItemId, tenantId: tid }
    });
  }

  const expenseTitle = String(
    body.title ||
      (matchedItem ? `Stationery Restock: ${matchedItem.name}${restockQty > 0 ? ` (${restockQty} ${matchedItem.unitLabel}s)` : ''}` : '')
  ).trim();
  if (!expenseTitle) {
    throw new AppError('Expense title or selected stationery item is required.', 400);
  }

  const currency = String(body.currency || matchedItem?.currency || 'GHS').toUpperCase();
  const vendorName = body.vendorName ? String(body.vendorName).trim() : 'Approved School Supplier';
  const notesText = body.notes
    ? String(body.notes).trim()
    : `Recorded via School Stationery & Bookshop Store by ${getActorDisplayName(req.user)} (${role}).`;

  // Sync directly into Finance module SchoolExpense so Accountant Dashboard reflects immediately
  const linkedExpense = await financeService.createExpense(
    tid,
    {
      category: 'STATIONERY_SUPPLIES',
      title: expenseTitle,
      amount: Math.round(amount * 100) / 100,
      currency,
      vendorName,
      paymentStatus: body.paymentStatus || 'PAID',
      incurredAt: body.incurredAt || new Date(),
      notes: notesText
    },
    parseNumericUserId(req.user)
  );

  let updatedItem = matchedItem;
  if (matchedItem && restockQty > 0) {
    updatedItem = await prisma.stationeryItem.update({
      where: { id: matchedItem.id },
      data: {
        stockQty: Number(matchedItem.stockQty || 0) + restockQty,
        updatedAt: new Date()
      }
    });
  }

  const txn = await prisma.stationeryTransaction.create({
    data: {
      id: `STX-EXP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: tid,
      referenceNumber: linkedExpense.expenseNumber,
      transactionType: restockQty > 0 ? 'RESTOCK_EXPENSE' : 'OPERATING_EXPENSE',
      itemId: matchedItem?.id || null,
      itemName: expenseTitle,
      category: matchedItem?.category || normalizeCategory(body.category || 'STATIONERY'),
      quantity: restockQty || 1,
      unitPrice: restockQty > 0 ? Math.round((amount / restockQty) * 100) / 100 : amount,
      totalAmount: Math.round(amount * 100) / 100,
      currency,
      vendorName,
      paymentStatus: linkedExpense.paymentStatus || 'PAID',
      recordedById: parseNumericUserId(req.user),
      recordedByName: getActorDisplayName(req.user),
      recordedByRole: role,
      linkedExpenseId: typeof linkedExpense.id === 'number' ? linkedExpense.id : null,
      linkedExpenseNumber: linkedExpense.expenseNumber,
      notes: notesText,
      occurredAt: linkedExpense.incurredAt || new Date()
    }
  });

  return {
    transaction: txn,
    linkedExpense,
    updatedItem
  };
}

async function approveOrderRequest(req) {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  const txnId = String(req.params.txnId || '').trim();
  const role = normalizeRole(req.user?.role);

  const txn = await prisma.stationeryTransaction.findFirst({
    where: { id: txnId, tenantId: tid }
  });
  if (!txn) {
    throw new AppError('Stationery order request not found.', 404);
  }
  if (txn.transactionType !== 'ORDER_REQUEST' || txn.paymentStatus === 'PAID') {
    throw new AppError('This stationery transaction is already finalized.', 400);
  }

  let updatedItem = null;
  if (txn.itemId) {
    const item = await prisma.stationeryItem.findFirst({
      where: { id: txn.itemId, tenantId: tid }
    });
    if (item) {
      if (Number(item.stockQty || 0) < Number(txn.quantity || 1)) {
        throw new AppError(`Insufficient stock to fulfill "${item.name}" (${item.stockQty} available).`, 400);
      }
      updatedItem = await prisma.stationeryItem.update({
        where: { id: item.id },
        data: { stockQty: Number(item.stockQty || 0) - Number(txn.quantity || 1) }
      });
    }
  }

  const updatedTxn = await prisma.stationeryTransaction.update({
    where: { id: txn.id },
    data: {
      transactionType: 'SALE',
      paymentStatus: 'PAID',
      notes: `${txn.notes ? txn.notes + ' | ' : ''}Issued & Paid (verified by ${getActorDisplayName(req.user)} / ${role})`
    }
  });

  return { transaction: updatedTxn, updatedItem };
}

async function listTransactions(req) {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  const where = { tenantId: tid };
  if (req.query?.type && req.query.type !== 'ALL') {
    where.transactionType = String(req.query.type).toUpperCase();
  }

  const transactions = await prisma.stationeryTransaction.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: 200
  });

  return { transactions };
}

async function getAuditSummary(req) {
  const tid = parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
  await ensureDemoStarterItemsIfDemo(req, tid);

  const [items, transactions, linkedFinanceExpenses] = await Promise.all([
    prisma.stationeryItem.findMany({ where: { tenantId: tid } }).catch(() => []),
    prisma.stationeryTransaction.findMany({ where: { tenantId: tid }, orderBy: { occurredAt: 'desc' } }).catch(() => []),
    prisma.schoolExpense.findMany({
      where: { tenantId: tid, category: 'STATIONERY_SUPPLIES' },
      orderBy: { incurredAt: 'desc' }
    }).catch(() => [])
  ]);

  let totalSalesRevenue = 0;
  let totalStationeryExpenses = 0;
  let pendingOrdersCount = 0;

  for (const t of transactions) {
    if (t.transactionType === 'SALE') totalSalesRevenue += Number(t.totalAmount || 0);
    if (t.transactionType === 'RESTOCK_EXPENSE' || t.transactionType === 'OPERATING_EXPENSE') {
      totalStationeryExpenses += Number(t.totalAmount || 0);
    }
    if (t.transactionType === 'ORDER_REQUEST' && t.paymentStatus === 'PENDING_APPROVAL') {
      pendingOrdersCount += 1;
    }
  }

  const lowStockItems = items.filter((it) => it.isActive && Number(it.stockQty || 0) <= Number(it.reorderLevel || 10));
  const totalCatalogValue = items.reduce(
    (sum, it) => sum + (Number(it.unitPrice || 0) * Number(it.stockQty || 0)),
    0
  );

  return {
    totalCatalogItems: items.filter((i) => i.isActive).length,
    totalCatalogInventoryValue: Math.round(totalCatalogValue * 100) / 100,
    totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
    totalStationeryExpenses: Math.round(totalStationeryExpenses * 100) / 100,
    netStationeryBalance: Math.round((totalSalesRevenue - totalStationeryExpenses) * 100) / 100,
    pendingOrdersCount,
    lowStockCount: lowStockItems.length,
    lowStockItems,
    linkedAccountantExpensesCount: linkedFinanceExpenses.length,
    linkedFinanceExpenses,
    recentTransactions: transactions.slice(0, 30)
  };
}

module.exports = {
  listCatalog,
  createItem,
  updateItem,
  recordSaleOrOrder,
  recordExpense,
  approveOrderRequest,
  listTransactions,
  getAuditSummary
};
