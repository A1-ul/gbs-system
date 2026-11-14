const prisma = require('../../core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');

function getStoreTickets(tid) {
  const store = readPersistentStore();
  const list = store.facilityTickets?.[String(tid)];
  return Array.isArray(list) ? list : [];
}

function saveStoreTickets(tid, list) {
  writePersistentStore((curr) => ({
    ...curr,
    facilityTickets: {
      ...(curr.facilityTickets || {}),
      [String(tid)]: list
    }
  }));
}

class FacilityService {
  async getTickets(tenantId = 1, filters = {}) {
    const tid = parseInt(tenantId, 10) || 1;
    let pgTickets = [];
    try {
      let query = `SELECT * FROM facility_tickets WHERE tenant_id = $1`;
      const params = [tid];
      let pIdx = 2;

      if (filters.status) {
        query += ` AND status = $${pIdx}`;
        params.push(filters.status.toUpperCase());
        pIdx++;
      }
      if (filters.category) {
        query += ` AND category = $${pIdx}`;
        params.push(filters.category.toUpperCase());
        pIdx++;
      }
      query += ` ORDER BY created_at DESC`;

      const tickets = await prisma.$queryRawUnsafe(query, ...params);
      if (Array.isArray(tickets)) pgTickets = tickets;
    } catch (_) {
      pgTickets = [];
    }

    let storeTickets = getStoreTickets(tid);
    if (filters.status) {
      storeTickets = storeTickets.filter((t) => String(t.status || '').toUpperCase() === filters.status.toUpperCase());
    }
    if (filters.category) {
      storeTickets = storeTickets.filter((t) => String(t.category || '').toUpperCase() === filters.category.toUpperCase());
    }

    const seen = new Set(pgTickets.map((t) => String(t.id)));
    return [...pgTickets, ...storeTickets.filter((t) => !seen.has(String(t.id)))];
  }

  async createTicket(tenantId = 1, data = {}) {
    const tid = parseInt(tenantId, 10) || 1;
    const ticketNumber = `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`;
    const title = data.title || 'General Maintenance Inspection';
    const category = (data.category || 'STRUCTURAL').toUpperCase();
    const location = data.location || 'General Campus Grounds';
    const priority = (data.priority || 'MEDIUM').toUpperCase();
    const estimatedCost = parseFloat(data.estimatedCost) || 0.00;
    const assignedStaff = data.assignedStaff || 'Unassigned Staff Lead';
    const reportedBy = data.reportedBy || 'Operations Lead';
    const resolutionNotes = data.resolutionNotes || '';

    let created = null;
    try {
      const result = await prisma.$queryRawUnsafe(`
        INSERT INTO facility_tickets (
          tenant_id, ticket_number, title, category, location, priority,
          status, estimated_cost, actual_cost, assigned_staff, reported_by, resolution_notes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, 0.00, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, tid, ticketNumber, title, category, location, priority, estimatedCost, assignedStaff, reportedBy, resolutionNotes);
      if (result && result[0]) created = result[0];
    } catch (_) {
      created = null;
    }

    if (!created) {
      created = {
        id: Date.now(),
        tenant_id: tid,
        tenantId: tid,
        ticket_number: ticketNumber,
        title,
        category,
        location,
        priority,
        status: 'PENDING',
        estimated_cost: estimatedCost,
        actual_cost: 0.00,
        assigned_staff: assignedStaff,
        reported_by: reportedBy,
        resolution_notes: resolutionNotes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      saveStoreTickets(tid, [created, ...getStoreTickets(tid)]);
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: tid,
          action: 'FACILITY_TICKET_CREATED',
          module: 'FACILITY',
          details: `Ticket ${ticketNumber} created for ${location}: ${title} ($${estimatedCost})`
        }
      });
    } catch (_) {}

    return created;
  }

  async updateTicketStatus(id, tenantId = 1, data = {}) {
    const tid = parseInt(tenantId, 10) || 1;
    const status = (data.status || 'IN_PROGRESS').toUpperCase();
    const actualCost = parseFloat(data.actualCost) || 0.00;
    const notes = data.resolutionNotes || '';
    const assignedStaff = data.assignedStaff;

    let updatedRecord = null;
    const parsedId = parseInt(id, 10);
    if (!Number.isNaN(parsedId)) {
      try {
        let updateQuery = `UPDATE facility_tickets SET status = $1, updated_at = NOW()`;
        const params = [status];
        let pIdx = 2;

        if (data.actualCost !== undefined) {
          updateQuery += `, actual_cost = $${pIdx}`;
          params.push(actualCost);
          pIdx++;
        }
        if (notes) {
          updateQuery += `, resolution_notes = $${pIdx}`;
          params.push(notes);
          pIdx++;
        }
        if (assignedStaff) {
          updateQuery += `, assigned_staff = $${pIdx}`;
          params.push(assignedStaff);
          pIdx++;
        }

        updateQuery += ` WHERE id = $${pIdx} AND tenant_id = $${pIdx + 1} RETURNING *`;
        params.push(parsedId, tid);

        const result = await prisma.$queryRawUnsafe(updateQuery, ...params);
        if (result && result.length > 0) updatedRecord = result[0];
      } catch (_) {
        updatedRecord = null;
      }
    }

    const list = getStoreTickets(tid);
    const storeIdx = list.findIndex((t) => String(t.id) === String(id));
    if (storeIdx >= 0) {
      list[storeIdx] = {
        ...list[storeIdx],
        status,
        actual_cost: data.actualCost !== undefined ? actualCost : list[storeIdx].actual_cost,
        resolution_notes: notes || list[storeIdx].resolution_notes,
        assigned_staff: assignedStaff || list[storeIdx].assigned_staff,
        updated_at: new Date().toISOString()
      };
      saveStoreTickets(tid, list);
      if (!updatedRecord) updatedRecord = list[storeIdx];
    }

    if (!updatedRecord) {
      throw new Error(`Facility ticket ID ${id} not found.`);
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: tid,
          action: 'FACILITY_TICKET_STATUS_UPDATED',
          module: 'FACILITY',
          details: `Ticket ${updatedRecord.ticket_number} status set to ${status}. Actual cost: $${actualCost}`
        }
      });
    } catch (_) {}

    return updatedRecord;
  }

  async getStats(tenantId = 1) {
    const tid = parseInt(tenantId, 10) || 1;
    try {
      const counts = await prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(*)::int AS total,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int AS pending,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int AS approved,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END)::int AS in_progress,
          COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END)::int AS resolved,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END)::int AS rejected,
          COALESCE(SUM(estimated_cost), 0)::float AS total_estimated_cost,
          COALESCE(SUM(actual_cost), 0)::float AS total_actual_cost
        FROM facility_tickets
        WHERE tenant_id = $1
      `, tid);

      const storeTickets = getStoreTickets(tid);
      if (counts[0] && storeTickets.length === 0) return counts[0];
      if (storeTickets.length > 0 && (!counts[0] || counts[0].total === 0)) {
        return {
          total: storeTickets.length,
          pending: storeTickets.filter((t) => t.status === 'PENDING').length,
          approved: storeTickets.filter((t) => t.status === 'APPROVED').length,
          in_progress: storeTickets.filter((t) => t.status === 'IN_PROGRESS').length,
          resolved: storeTickets.filter((t) => t.status === 'RESOLVED').length,
          rejected: storeTickets.filter((t) => t.status === 'REJECTED').length,
          total_estimated_cost: storeTickets.reduce((s, t) => s + (Number(t.estimated_cost) || 0), 0),
          total_actual_cost: storeTickets.reduce((s, t) => s + (Number(t.actual_cost) || 0), 0)
        };
      }
      return counts[0];
    } catch (_) {
      const storeTickets = getStoreTickets(tid);
      return {
        total: storeTickets.length,
        pending: storeTickets.filter((t) => t.status === 'PENDING').length,
        approved: storeTickets.filter((t) => t.status === 'APPROVED').length,
        in_progress: storeTickets.filter((t) => t.status === 'IN_PROGRESS').length,
        resolved: storeTickets.filter((t) => t.status === 'RESOLVED').length,
        rejected: storeTickets.filter((t) => t.status === 'REJECTED').length,
        total_estimated_cost: storeTickets.reduce((s, t) => s + (Number(t.estimated_cost) || 0), 0),
        total_actual_cost: storeTickets.reduce((s, t) => s + (Number(t.actual_cost) || 0), 0)
      };
    }
  }
}

module.exports = new FacilityService();
