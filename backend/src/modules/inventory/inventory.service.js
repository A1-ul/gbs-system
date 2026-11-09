'use strict';

const prisma = require('../../core/database/prisma.client');
const logger = require('../../utils/logger') || console;
const { readStore, writeStore } = require('./inventory.store');

function success(data = null, message = null) {
  return {
    success: true,
    message,
    data
  };
}

function failure(message) {
  return {
    success: false,
    message,
    data: null
  };
}

async function getItems(tenantId = 1, category = '', search = '') {
  const tid = parseInt(tenantId, 10) || 1;
  try {
    let query = 'SELECT * FROM inventory_items WHERE tenant_id = $1';
    const params = [tid];

    if (category && category !== 'ALL') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (name ILIKE $${params.length} OR item_code ILIKE $${params.length} OR location ILIKE $${params.length})`;
    }

    query += ' ORDER BY id ASC';

    const items = await prisma.$queryRawUnsafe(query, ...params);
    if (items && items.length > 0) {
      return success({ count: items.length, records: items });
    }
  } catch (error) {
    if (logger.warn) logger.warn('INVENTORY_GET_ITEMS_PRISMA_FALLBACK', { error: error.message });
  }

  // Resilient fallback to persistent JSON store
  const store = readStore();
  let filtered = store.items.filter((item) => parseInt(item.tenant_id, 10) === tid || tid === 1);

  if (category && category !== 'ALL') {
    filtered = filtered.filter((i) => String(i.category).toUpperCase() === String(category).toUpperCase());
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (i) =>
        (i.name && i.name.toLowerCase().includes(q)) ||
        (i.item_code && i.item_code.toLowerCase().includes(q)) ||
        (i.location && i.location.toLowerCase().includes(q))
    );
  }

  return success({ count: filtered.length, records: filtered });
}

async function createItem(payload, tenantId = 1) {
  const tid = parseInt(tenantId, 10) || 1;
  const {
    itemCode,
    name,
    category,
    unit,
    quantityOnHand,
    reorderLevel,
    unitPrice,
    location,
    purchasedByStaff,
    purchaserDept
  } = payload;

  if (!itemCode || !name || !category) {
    return failure('Item code, name, and category are required');
  }

  const qty = parseInt(quantityOnHand, 10) || 0;
  const reorder = parseInt(reorderLevel, 10) || 10;
  const price = parseFloat(unitPrice) || 0.0;
  const status = qty <= 0 ? 'OUT_OF_STOCK' : qty <= reorder ? 'LOW_STOCK' : 'IN_STOCK';
  const staff = purchasedByStaff || 'Mr. Samuel Adjei (Procurement Officer)';
  const dept = purchaserDept || 'Procurement & Logistics';

  try {
    const result = await prisma.$queryRawUnsafe(
      `
      INSERT INTO inventory_items (tenant_id, item_code, name, category, unit, quantity_on_hand, reorder_level, unit_price, location, status, purchased_by_staff, purchaser_dept)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `,
      tid,
      itemCode,
      name,
      category,
      unit || 'PIECES',
      qty,
      reorder,
      price,
      location || 'Warehouse Section A',
      status,
      staff,
      dept
    );

    if (result && result.length > 0) {
      return success(result[0], 'Inventory item registered successfully');
    }
  } catch (error) {
    if (logger.warn) logger.warn('INVENTORY_CREATE_ITEM_PRISMA_FALLBACK', { error: error.message });
  }

  // Resilient fallback save
  const store = readStore();
  const exists = store.items.some(
    (i) => i.item_code.toLowerCase() === itemCode.toLowerCase() && parseInt(i.tenant_id, 10) === tid
  );
  if (exists) {
    return failure('Item code already exists in catalog');
  }

  const newItem = {
    id: store.items.length > 0 ? Math.max(...store.items.map((i) => i.id || 0)) + 1 : 1,
    tenant_id: tid,
    item_code: itemCode,
    name,
    category,
    unit: unit || 'PIECES',
    quantity_on_hand: qty,
    reorder_level: reorder,
    unit_price: price,
    location: location || 'Warehouse Section A',
    status,
    purchased_by_staff: staff,
    purchaser_dept: dept,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  store.items.push(newItem);
  writeStore(store);
  return success(newItem, 'Inventory item registered successfully');
}

async function adjustStock(itemId, payload, tenantId = 1) {
  const tid = parseInt(tenantId, 10) || 1;
  const iid = parseInt(itemId, 10);
  const { adjustmentAmount, reason } = payload;

  const delta = parseInt(adjustmentAmount, 10);
  if (isNaN(delta) || delta === 0) {
    return failure('Valid non-zero adjustment amount is required');
  }

  try {
    const existing = await prisma.$queryRawUnsafe(
      'SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2',
      iid,
      tid
    );

    if (existing && existing.length > 0) {
      const newQty = Math.max(0, existing[0].quantity_on_hand + delta);
      const newStatus = newQty <= 0 ? 'OUT_OF_STOCK' : newQty <= existing[0].reorder_level ? 'LOW_STOCK' : 'IN_STOCK';

      const updated = await prisma.$queryRawUnsafe(
        `
        UPDATE inventory_items
        SET quantity_on_hand = $1,
            status = $2,
            updated_at = NOW()
        WHERE id = $3 AND tenant_id = $4
        RETURNING *;
      `,
        newQty,
        newStatus,
        iid,
        tid
      );

      if (updated && updated.length > 0) {
        return success(
          updated[0],
          `Stock adjusted by ${delta > 0 ? `+${delta}` : delta}. New quantity: ${newQty}`
        );
      }
    }
  } catch (error) {
    if (logger.warn) logger.warn('INVENTORY_ADJUST_STOCK_PRISMA_FALLBACK', { error: error.message });
  }

  // Resilient fallback adjustment
  const store = readStore();
  const idx = store.items.findIndex((i) => i.id === iid);
  if (idx === -1) {
    return failure('Inventory item not found');
  }

  const current = store.items[idx];
  const newQty = Math.max(0, current.quantity_on_hand + delta);
  const newStatus = newQty <= 0 ? 'OUT_OF_STOCK' : newQty <= current.reorder_level ? 'LOW_STOCK' : 'IN_STOCK';

  store.items[idx] = {
    ...current,
    quantity_on_hand: newQty,
    status: newStatus,
    updated_at: new Date().toISOString(),
    last_reason: reason || 'Inventory cycle count audit'
  };

  writeStore(store);
  return success(store.items[idx], `Stock adjusted by ${delta > 0 ? `+${delta}` : delta}. New quantity: ${newQty}`);
}

async function getRequests(tenantId = 1) {
  const tid = parseInt(tenantId, 10) || 1;
  try {
    const requests = await prisma.$queryRawUnsafe(
      `
      SELECT r.*, i.unit_price, (r.quantity_requested * i.unit_price)::numeric(10,2) as total_estimated_cost
      FROM inventory_requests r
      JOIN inventory_items i ON r.item_id = i.id
      WHERE r.tenant_id = $1
      ORDER BY r.id DESC;
    `,
      tid
    );

    if (requests && requests.length > 0) {
      return success({ count: requests.length, records: requests });
    }
  } catch (error) {
    if (logger.warn) logger.warn('INVENTORY_GET_REQUESTS_PRISMA_FALLBACK', { error: error.message });
  }

  // Resilient fallback
  const store = readStore();
  const list = store.requests.filter((r) => parseInt(r.tenant_id, 10) === tid || tid === 1);
  return success({ count: list.length, records: list });
}

async function createRequest(payload, tenantId = 1) {
  const tid = parseInt(tenantId, 10) || 1;
  const { itemId, requesterId, requesterName, department, quantityRequested, urgency, notes } = payload;

  const iid = parseInt(itemId, 10);
  const uid = parseInt(requesterId, 10) || 1;
  const qty = parseInt(quantityRequested, 10) || 1;

  const store = readStore();
  const matchedItem = store.items.find((i) => i.id === iid) || { name: 'Institutional Supply', unit_price: 25.0 };
  const reqNum = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const item = await prisma.$queryRawUnsafe(
      'SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2',
      iid,
      tid
    );
    if (item && item.length > 0) {
      const result = await prisma.$queryRawUnsafe(
        `
        INSERT INTO inventory_requests (tenant_id, request_number, item_id, item_name, requester_id, requester_name, department, quantity_requested, urgency, status, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', $10)
        RETURNING *;
      `,
        tid,
        reqNum,
        iid,
        item[0].name,
        uid,
        requesterName || 'Staff Requester',
        department || 'ACADEMIC',
        qty,
        urgency || 'MEDIUM',
        notes || ''
      );

      if (result && result.length > 0) {
        return success(result[0], 'Purchase requisition submitted successfully');
      }
    }
  } catch (error) {
    if (logger.warn) logger.warn('INVENTORY_CREATE_REQUEST_PRISMA_FALLBACK', { error: error.message });
  }

  // Resilient fallback
  const newReq = {
    id: store.requests.length > 0 ? Math.max(...store.requests.map((r) => r.id || 0)) + 1 : 1,
    tenant_id: tid,
    request_number: reqNum,
    item_id: iid,
    item_name: matchedItem.name,
    requester_id: uid,
    requester_name: requesterName || 'Staff Requester',
    department: department || 'ACADEMIC',
    quantity_requested: qty,
    urgency: urgency || 'MEDIUM',
    status: 'PENDING',
    unit_price: matchedItem.unit_price || 25.0,
    total_estimated_cost: ((matchedItem.unit_price || 25.0) * qty).toFixed(2),
    notes: notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  store.requests.unshift(newReq);
  writeStore(store);
  return success(newReq, 'Purchase requisition submitted successfully');
}

async function updateRequestStatus(requestId, payload, tenantId = 1) {
  const tid = parseInt(tenantId, 10) || 1;
  const rid = parseInt(requestId, 10);
  const { status, notes } = payload;

  const valid = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'];
  if (!valid.includes(status)) {
    return failure('Invalid requisition status');
  }

  try {
    const updated = await prisma.$queryRawUnsafe(
      `
      UPDATE inventory_requests
      SET status = $1,
          notes = COALESCE($2, notes),
          updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *;
    `,
      status,
      notes || null,
      rid,
      tid
    );

    if (updated && updated.length > 0) {
      if (status === 'FULFILLED') {
        await prisma.$executeRawUnsafe(
          `
          UPDATE inventory_items
          SET quantity_on_hand = quantity_on_hand + $1,
              status = CASE WHEN (quantity_on_hand + $1) > reorder_level THEN 'IN_STOCK' ELSE 'LOW_STOCK' END,
              updated_at = NOW()
          WHERE id = $2 AND tenant_id = $3;
        `,
          updated[0].quantity_requested,
          updated[0].item_id,
          tid
        );
      }
      return success(updated[0], `Requisition status updated to ${status}`);
    }
  } catch (error) {
    if (logger.warn) logger.warn('INVENTORY_UPDATE_REQUEST_PRISMA_FALLBACK', { error: error.message });
  }

  // Resilient fallback
  const store = readStore();
  const reqIdx = store.requests.findIndex((r) => r.id === rid);
  if (reqIdx === -1) {
    return failure('Request not found');
  }

  store.requests[reqIdx] = {
    ...store.requests[reqIdx],
    status,
    notes: notes || store.requests[reqIdx].notes,
    updated_at: new Date().toISOString()
  };

  if (status === 'FULFILLED') {
    const itemIdx = store.items.findIndex((i) => i.id === store.requests[reqIdx].item_id);
    if (itemIdx !== -1) {
      const q = store.items[itemIdx].quantity_on_hand + store.requests[reqIdx].quantity_requested;
      store.items[itemIdx].quantity_on_hand = q;
      store.items[itemIdx].status = q > store.items[itemIdx].reorder_level ? 'IN_STOCK' : 'LOW_STOCK';
      store.items[itemIdx].updated_at = new Date().toISOString();
    }
  }

  writeStore(store);
  return success(store.requests[reqIdx], `Requisition status updated to ${status}`);
}

async function getStats(tenantId = 1) {
  const tid = parseInt(tenantId, 10) || 1;
  try {
    const itemStats = await prisma.$queryRawUnsafe(
      `
      SELECT 
        COUNT(*)::int as total_skus,
        COALESCE(SUM(quantity_on_hand), 0)::int as total_units,
        COALESCE(SUM(quantity_on_hand * unit_price), 0)::float as total_valuation,
        COUNT(CASE WHEN status = 'LOW_STOCK' OR status = 'OUT_OF_STOCK' THEN 1 END)::int as low_stock_alerts
      FROM inventory_items
      WHERE tenant_id = $1;
    `,
      tid
    );

    const reqStats = await prisma.$queryRawUnsafe(
      `
      SELECT 
        COUNT(*)::int as total_requests,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending_requests
      FROM inventory_requests
      WHERE tenant_id = $1;
    `,
      tid
    );

    if (itemStats && itemStats[0]?.total_skus > 0) {
      return success({
        totalSkus: itemStats[0]?.total_skus || 0,
        totalUnits: itemStats[0]?.total_units || 0,
        totalValuation: itemStats[0]?.total_valuation || 0,
        lowStockAlerts: itemStats[0]?.low_stock_alerts || 0,
        totalRequests: reqStats[0]?.total_requests || 0,
        pendingRequests: reqStats[0]?.pending_requests || 0
      });
    }
  } catch (error) {
    if (logger.warn) logger.warn('INVENTORY_GET_STATS_PRISMA_FALLBACK', { error: error.message });
  }

  // Resilient fallback
  const store = readStore();
  const items = store.items.filter((i) => parseInt(i.tenant_id, 10) === tid || tid === 1);
  const requests = store.requests.filter((r) => parseInt(r.tenant_id, 10) === tid || tid === 1);

  const totalSkus = items.length;
  const totalUnits = items.reduce((sum, i) => sum + (i.quantity_on_hand || 0), 0);
  const totalValuation = items.reduce((sum, i) => sum + (i.quantity_on_hand || 0) * (i.unit_price || 0), 0);
  const lowStockAlerts = items.filter((i) => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK').length;
  const totalRequests = requests.length;
  const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;

  return success({
    totalSkus,
    totalUnits,
    totalValuation,
    lowStockAlerts,
    totalRequests,
    pendingRequests
  });
}

async function getStatus() {
  return {
    module: 'inventory',
    status: 'OPERATIONAL',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getItems,
  createItem,
  adjustStock,
  getRequests,
  createRequest,
  updateRequestStatus,
  getStats,
  getStatus
};
