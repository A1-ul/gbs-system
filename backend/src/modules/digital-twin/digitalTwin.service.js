const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DigitalTwinService {
  async getZones(tenantId = 1) {
    const zones = await prisma.$queryRawUnsafe(`
      SELECT * FROM campus_zones
      WHERE tenant_id = $1
      ORDER BY zone_name ASC
    `, tenantId);
    return zones;
  }

  async getZoneById(id, tenantId = 1) {
    const zones = await prisma.$queryRawUnsafe(`
      SELECT * FROM campus_zones
      WHERE id = $1 AND tenant_id = $2
    `, parseInt(id), tenantId);
    if (!zones || zones.length === 0) {
      throw new Error(`Campus zone ID ${id} not found.`);
    }
    return zones[0];
  }

  async setZoneLockStatus(id, tenantId = 1, lockStatus = 'SECURE') {
    const valid = ['SECURE', 'OPEN', 'LOCKDOWN'];
    const status = lockStatus.toUpperCase();
    if (!valid.includes(status)) {
      throw new Error(`Invalid lock status: ${lockStatus}. Allowed: ${valid.join(', ')}`);
    }

    const updated = await prisma.$queryRawUnsafe(`
      UPDATE campus_zones
      SET lock_status = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, status, parseInt(id), tenantId);

    if (!updated || updated.length === 0) {
      throw new Error(`Campus zone ID ${id} not found.`);
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'CAMPUS_ZONE_LOCK_TOGGLED',
          module: 'DIGITAL_TWIN',
          details: `Zone ${updated[0].zone_name} (${updated[0].zone_code}) lock status changed to ${status}`
        }
      });
    } catch (_) {}

    return updated[0];
  }

  async recordTelemetry(zoneId, metricType, metricValue, unit = '') {
    const record = await prisma.$queryRawUnsafe(`
      INSERT INTO campus_telemetry_logs (zone_id, metric_type, metric_value, unit, recorded_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `, parseInt(zoneId), metricType.toUpperCase(), parseFloat(metricValue), unit);

    return record[0];
  }

  async getTelemetryHistory(zoneId, limit = 20) {
    const logs = await prisma.$queryRawUnsafe(`
      SELECT * FROM campus_telemetry_logs
      WHERE zone_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2
    `, parseInt(zoneId), limit);
    return logs;
  }

  async getSummary(tenantId = 1) {
    const summary = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int AS total_zones,
        COALESCE(SUM(current_occupancy), 0)::int AS total_campus_occupancy,
        COALESCE(SUM(max_capacity), 0)::int AS total_campus_capacity,
        COALESCE(SUM(power_consumption_kw), 0)::float AS total_power_load_kw,
        COALESCE(AVG(temperature_celsius), 0)::float AS avg_temperature,
        COALESCE(AVG(humidity_percent), 0)::float AS avg_humidity,
        COUNT(CASE WHEN lock_status = 'LOCKDOWN' THEN 1 END)::int AS active_lockdowns,
        COUNT(CASE WHEN lock_status = 'SECURE' THEN 1 END)::int AS secure_zones
      FROM campus_zones
      WHERE tenant_id = $1
    `, tenantId);

    return summary[0] || {
      total_zones: 0, total_campus_occupancy: 0, total_campus_capacity: 0,
      total_power_load_kw: 0, avg_temperature: 0, avg_humidity: 0,
      active_lockdowns: 0, secure_zones: 0
    };
  }
}

module.exports = new DigitalTwinService();
