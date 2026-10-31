'use strict';

const prisma = require('../../core/database/prisma.client');
const logger = require('../../utils/logger') || console;

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
  try {
    const tid = parseInt(tenantId, 10) || 1;
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
    return success({ count: items.length, records: items });
  } catch (error) {
    if (logger.error) logger.error('INVENTORY_GET_ITEMS_ERROR', { error: error.message });
    return failure('Failed to retrieve inventory items');
  }
}

async function createItem(payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { itemCode, name, category, unit, quantityOnHand, reorderLevel, unitPrice, location, purchasedByStaff, purchaserDept } = payload;

    if (!itemCode || !name || !category) {
      return failure('Item code, name, and category are required');
    }

    const qty = parseInt(quantityOnHand, 10) || 0;
    const reorder = parseInt(reorderLevel, 10) || 10;
    const price = parseFloat(unitPrice) || 0.00;
    const status = qty <= 0 ? 'OUT_OF_STOCK' : (qty <= reorder ? 'LOW_STOCK' : 'IN_STOCK');
    const staff = purchasedByStaff || 'Mr. Samuel Adjei (Procurement Officer)';
    const dept = purchaserDept || 'Procurement & Logistics';

    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO inventory_items (tenant_id, item_code, name, category, unit, quantity_on_hand, reorder_level, unit_price, location, status, purchased_by_staff, purchaser_dept)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `, tid, itemCode, name, category, unit || 'PIECES', qty, reorder, price, location || 'Warehouse Section A', status, staff, dept);

    return success(result[0], 'Inventory item registered successfully');
  } catch (error) {
    if (logger.error) logger.error('INVENTORY_CREATE_ITEM_ERROR', { error: error.message });
    return failure(error.message.includes('unique') ? 'Item code already exists' : 'Failed to register item');
  }
}

async function adjustStock(itemId, payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const iid = parseInt(itemId, 10);
    const { adjustmentAmount, reason } = payload;

    const delta = parseInt(adjustmentAmount, 10);
    if (isNaN(delta) || delta === 0) {
      return failure('Valid non-zero adjustment amount is required');
    }

    const existing = await prisma.$queryRawUnsafe(
      'SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2',
      iid,
      tid
    );

    if (!existing || existing.length === 0) {
      return failure('Inventory item not found');
    }

    const newQty = Math.max(0, existing[0].quantity_on_hand + delta);
    const newStatus = newQty <= 0 ? 'OUT_OF_STOCK' : (newQty <= existing[0].reorder_level ? 'LOW_STOCK' : 'IN_STOCK');

    const updated = await prisma.$queryRawUnsafe(`
      UPDATE inventory_items
      SET quantity_on_hand = $1,
          status = $2,
          updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *;
    `, newQty, newStatus, iid, tid);

    return success(updated[0], `Stock adjusted by ${delta > 0 ? `+${delta}` : delta}. New quantity: ${newQty}`);
  } catch (error) {
    if (logger.error) logger.error('INVENTORY_ADJUST_STOCK_ERROR', { error: error.message });
    return failure('Failed to adjust stock');
  }
}

async function getRequests(tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const requests = await prisma.$queryRawUnsafe(`
      SELECT r.*, i.unit_price, (r.quantity_requested * i.unit_price)::numeric(10,2) as total_estimated_cost
      FROM inventory_requests r
      JOIN inventory_items i ON r.item_id = i.id
      WHERE r.tenant_id = $1
      ORDER BY r.id DESC;
    `, tid);

    return success({ count: requests.length, records: requests });
  } catch (error) {
    if (logger.error) logger.error('INVENTORY_GET_REQUESTS_ERROR', { error: error.message });
    return failure('Failed to retrieve inventory purchase requests');
  }
}

async function createRequest(payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { itemId, requesterId, requesterName, department, quantityRequested, urgency, notes } = payload;

    const iid = parseInt(itemId, 10);
    const uid = parseInt(requesterId, 10);
    const qty = parseInt(quantityRequested, 10) || 1;

    const item = await prisma.$queryRawUnsafe('SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2', iid, tid);
    if (!item || item.length === 0) {
      return failure('Target inventory item not found');
    }

    const reqNum = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO inventory_requests (tenant_id, request_number, item_id, item_name, requester_id, requester_name, department, quantity_requested, urgency, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', $10)
      RETURNING *;
    `, tid, reqNum, iid, item[0].name, uid, requesterName || 'Staff Requester', department || 'ACADEMIC', qty, urgency || 'MEDIUM', notes || '');

    return success(result[0], 'Purchase requisition submitted successfully');
  } catch (error) {
    if (logger.error) logger.error('INVENTORY_CREATE_REQUEST_ERROR', { error: error.message });
    return failure('Failed to submit purchase request');
  }
}

async function updateRequestStatus(requestId, payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const rid = parseInt(requestId, 10);
    const { status, notes } = payload;

    const valid = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'];
    if (!valid.includes(status)) {
      return failure('Invalid requisition status');
    }

    const updated = await prisma.$queryRawUnsafe(`
      UPDATE inventory_requests
      SET status = $1,
          notes = COALESCE($2, notes),
          updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *;
    `, status, notes || null, rid, tid);

    if (!updated || updated.length === 0) {
      return failure('Request not found');
    }

    // If fulfilled, automatically increase item quantity in stock
    if (status === 'FULFILLED') {
      await prisma.$executeRawUnsafe(`
        UPDATE inventory_items
        SET quantity_on_hand = quantity_on_hand + $1,
            status = CASE WHEN (quantity_on_hand + $1) > reorder_level THEN 'IN_STOCK' ELSE 'LOW_STOCK' END,
            updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3;
      `, updated[0].quantity_requested, updated[0].item_id, tid);
    }

    return success(updated[0], `Requisition status updated to ${status}`);
  } catch (error) {
    if (logger.error) logger.error('INVENTORY_UPDATE_REQUEST_STATUS_ERROR', { error: error.message });
    return failure('Failed to update request status');
  }
}

async function getStats(tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const itemStats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int as total_skus,
        COALESCE(SUM(quantity_on_hand), 0)::int as total_units,
        COALESCE(SUM(quantity_on_hand * unit_price), 0)::float as total_valuation,
        COUNT(CASE WHEN status = 'LOW_STOCK' OR status = 'OUT_OF_STOCK' THEN 1 END)::int as low_stock_alerts
      FROM inventory_items
      WHERE tenant_id = $1;
    `, tid);

    const reqStats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int as total_requests,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending_requests
      FROM inventory_requests
      WHERE tenant_id = $1;
    `, tid);

    return success({
      totalSkus: itemStats[0]?.total_skus || 0,
      totalUnits: itemStats[0]?.total_units || 0,
      totalValuation: itemStats[0]?.total_valuation || 0,
      lowStockAlerts: itemStats[0]?.low_stock_alerts || 0,
      totalRequests: reqStats[0]?.total_requests || 0,
      pendingRequests: reqStats[0]?.pending_requests || 0
    });
  } catch (error) {
    if (logger.error) logger.error('INVENTORY_GET_STATS_ERROR', { error: error.message });
    return failure('Failed to retrieve inventory telemetry');
  }
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
