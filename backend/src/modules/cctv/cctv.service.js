const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CCTVService {
  async getStreams(tenantId = 1) {
    const streams = await prisma.$queryRawUnsafe(`
      SELECT * FROM cctv_streams
      WHERE tenant_id = $1
      ORDER BY camera_code ASC
    `, tenantId);
    return streams;
  }

  async getStreamById(id, tenantId = 1) {
    const streams = await prisma.$queryRawUnsafe(`
      SELECT * FROM cctv_streams
      WHERE id = $1 AND tenant_id = $2
    `, parseInt(id), tenantId);
    if (!streams || streams.length === 0) {
      throw new Error(`CCTV camera stream ID ${id} not found.`);
    }
    return streams[0];
  }

  async createStream(tenantId = 1, data = {}) {
    const cameraCode = data.cameraCode || `CAM-SEC-${Math.floor(100 + Math.random() * 900)}`;
    const cameraName = data.cameraName || 'Perimeter Security Camera';
    const location = data.location || 'Main Campus Gate';
    const streamUrl = data.streamUrl || `rtsp://stream.gbs-system.edu/live/${cameraCode.toLowerCase()}`;
    const resolution = data.resolution || '1080p 60FPS';
    const status = (data.status || 'ONLINE').toUpperCase();
    const ipAddress = data.ipAddress || '192.168.10.200';

    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO cctv_streams (
        tenant_id, camera_code, camera_name, location, stream_url,
        resolution, status, ip_address, ai_detection_enabled, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
      RETURNING *
    `, tenantId, cameraCode, cameraName, location, streamUrl, resolution, status, ipAddress);

    return result[0];
  }

  async updateStreamStatus(id, tenantId = 1, status = 'ONLINE') {
    const valid = ['ONLINE', 'RECORDING', 'MAINTENANCE', 'OFFLINE'];
    const s = status.toUpperCase();
    if (!valid.includes(s)) {
      throw new Error(`Invalid camera status: ${status}. Allowed: ${valid.join(', ')}`);
    }

    const updated = await prisma.$queryRawUnsafe(`
      UPDATE cctv_streams
      SET status = $1
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, s, parseInt(id), tenantId);

    if (!updated || updated.length === 0) {
      throw new Error(`CCTV camera ID ${id} not found.`);
    }
    return updated[0];
  }

  async getGateEvents(tenantId = 1, filters = {}) {
    let query = `
      SELECT e.*, c.camera_name, c.camera_code
      FROM security_gate_events e
      LEFT JOIN cctv_streams c ON e.camera_id = c.id
      WHERE e.tenant_id = $1
    `;
    const params = [tenantId];
    let pIdx = 2;

    if (filters.eventType) {
      query += ` AND e.event_type = $${pIdx}`;
      params.push(filters.eventType.toUpperCase());
      pIdx++;
    }
    if (filters.isFlagged !== undefined) {
      query += ` AND e.is_flagged = $${pIdx}`;
      params.push(filters.isFlagged === 'true' || filters.isFlagged === true);
      pIdx++;
    }

    query += ` ORDER BY e.timestamp DESC LIMIT 50`;
    const events = await prisma.$queryRawUnsafe(query, ...params);
    return events;
  }

  async recordGateEvent(tenantId = 1, data = {}) {
    const eventId = `SGE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const cameraId = data.cameraId ? parseInt(data.cameraId) : 1;
    const personName = data.personName || 'Visitor Scan';
    const personRole = (data.personRole || 'STUDENT').toUpperCase();
    const eventType = (data.eventType || 'ACCESS_GRANTED').toUpperCase();
    const gateLocation = data.gateLocation || 'North Gate Turnstile #1';
    const matchConfidence = parseFloat(data.matchConfidence) || 98.5;
    const livenessScore = parseFloat(data.livenessScore) || 99.0;
    const isFlagged = eventType === 'INTRUSION_ALERT' || eventType === 'ACCESS_DENIED' || data.isFlagged === true;

    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO security_gate_events (
        tenant_id, event_id, camera_id, person_name, person_role,
        event_type, gate_location, match_confidence, liveness_score,
        snapshot_url, is_flagged, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `, tenantId, eventId, cameraId, personName, personRole, eventType, gateLocation, matchConfidence, livenessScore, data.snapshotUrl || null, isFlagged);

    // Audit log if flagged
    if (isFlagged) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            action: 'SECURITY_GATE_BREACH_ALERT',
            module: 'SECURITY',
            details: `Gate security breach at ${gateLocation} by ${personName} (${eventType})`
          }
        });
      } catch (_) {}
    }

    return result[0];
  }

  async toggleFlagEvent(id, tenantId = 1) {
    const result = await prisma.$queryRawUnsafe(`
      UPDATE security_gate_events
      SET is_flagged = NOT is_flagged
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, parseInt(id), tenantId);

    if (!result || result.length === 0) {
      throw new Error(`Security event ID ${id} not found.`);
    }
    return result[0];
  }

  async getStats(tenantId = 1) {
    const camStats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int AS total_cameras,
        COUNT(CASE WHEN status = 'ONLINE' OR status = 'RECORDING' THEN 1 END)::int AS online_cameras,
        COUNT(CASE WHEN status = 'MAINTENANCE' THEN 1 END)::int AS maintenance_cameras
      FROM cctv_streams
      WHERE tenant_id = $1
    `, tenantId);

    const eventStats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int AS total_events,
        COUNT(CASE WHEN event_type = 'ACCESS_GRANTED' THEN 1 END)::int AS access_granted,
        COUNT(CASE WHEN event_type = 'ACCESS_DENIED' THEN 1 END)::int AS access_denied,
        COUNT(CASE WHEN is_flagged = true THEN 1 END)::int AS flagged_incidents,
        COALESCE(AVG(liveness_score), 0)::float AS avg_liveness_score
      FROM security_gate_events
      WHERE tenant_id = $1
    `, tenantId);

    return {
      cameras: camStats[0] || { total_cameras: 0, online_cameras: 0, maintenance_cameras: 0 },
      events: eventStats[0] || { total_events: 0, access_granted: 0, access_denied: 0, flagged_incidents: 0, avg_liveness_score: 0 }
    };
  }
}

module.exports = new CCTVService();