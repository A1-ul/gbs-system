const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class FacilityService {
  async getTickets(tenantId = 1, filters = {}) {
    let query = `SELECT * FROM facility_tickets WHERE tenant_id = $1`;
    const params = [tenantId];
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
    return tickets;
  }

  async createTicket(tenantId = 1, data = {}) {
    const ticketNumber = `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`;
    const title = data.title || 'General Maintenance Inspection';
    const category = (data.category || 'STRUCTURAL').toUpperCase();
    const location = data.location || 'General Campus Grounds';
    const priority = (data.priority || 'MEDIUM').toUpperCase();
    const estimatedCost = parseFloat(data.estimatedCost) || 0.00;
    const assignedStaff = data.assignedStaff || 'Unassigned Staff Lead';
    const reportedBy = data.reportedBy || 'Operations Lead';
    const resolutionNotes = data.resolutionNotes || '';

    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO facility_tickets (
        tenant_id, ticket_number, title, category, location, priority,
        status, estimated_cost, actual_cost, assigned_staff, reported_by, resolution_notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, 0.00, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, tenantId, ticketNumber, title, category, location, priority, estimatedCost, assignedStaff, reportedBy, resolutionNotes);

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'FACILITY_TICKET_CREATED',
          module: 'FACILITY',
          details: `Ticket ${ticketNumber} created for ${location}: ${title} ($${estimatedCost})`
        }
      });
    } catch (_) {}

    return result[0];
  }

  async updateTicketStatus(id, tenantId = 1, data = {}) {
    const status = (data.status || 'IN_PROGRESS').toUpperCase();
    const actualCost = parseFloat(data.actualCost) || 0.00;
    const notes = data.resolutionNotes || '';
    const assignedStaff = data.assignedStaff;

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
    params.push(parseInt(id), tenantId);

    const result = await prisma.$queryRawUnsafe(updateQuery, ...params);
    if (!result || result.length === 0) {
      throw new Error(`Facility ticket ID ${id} not found.`);
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'FACILITY_TICKET_STATUS_UPDATED',
          module: 'FACILITY',
          details: `Ticket ${result[0].ticket_number} status set to ${status}. Actual cost: $${actualCost}`
        }
      });
    } catch (_) {}

    return result[0];
  }

  async getStats(tenantId = 1) {
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
    `, tenantId);

    return counts[0] || {
      total: 0, pending: 0, approved: 0, in_progress: 0, resolved: 0, rejected: 0,
      total_estimated_cost: 0, total_actual_cost: 0
    };
  }
}

module.exports = new FacilityService();
