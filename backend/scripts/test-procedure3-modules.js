const API_BASE = 'http://localhost:5001/api/v1';

async function req(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PROCEDURE 3: ADVANCED ENTERPRISE MODULES AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Facility & Maintenance
  console.log('--- 1. FACILITY & MAINTENANCE WORK ORDERS ---');
  await test('GET /facility/tickets (Query seeded tickets)', async () => {
    const res = await req('/facility/tickets?tenantId=1');
    if (res.status !== 200 || !Array.isArray(res.data.data) || res.data.data.length === 0) {
      throw new Error(`Expected tickets array, got status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  });

  let createdTicketId = null;
  await test('POST /facility/tickets (Create maintenance work order)', async () => {
    const res = await req('/facility/tickets', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 1,
        title: 'Solar Inverter Firmware & Relay Diagnostic',
        category: 'ELECTRICAL',
        location: 'Rooftop Solar Array Block C',
        priority: 'HIGH',
        estimatedCost: 620.00,
        assignedStaff: 'Engineering Team Alpha',
        reportedBy: 'Campus Sustainability Office'
      })
    });
    if (res.status !== 201 || !res.data.data.id) {
      throw new Error(`Ticket not created: ${JSON.stringify(res.data)}`);
    }
    createdTicketId = res.data.data.id;
  });

  await test('PATCH /facility/tickets/:id/status (Dispatch & approve ticket)', async () => {
    const res = await req(`/facility/tickets/${createdTicketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        tenantId: 1,
        status: 'APPROVED',
        actualCost: 590.00,
        resolutionNotes: 'Technician dispatched with replacement relay modules.'
      })
    });
    if (res.status !== 200 || res.data.data.status !== 'APPROVED') {
      throw new Error(`Failed to update ticket status: ${JSON.stringify(res.data)}`);
    }
  });

  await test('GET /facility/stats (Query financial and count telemetry)', async () => {
    const res = await req('/facility/stats?tenantId=1');
    if (res.status !== 200 || typeof res.data.data.total !== 'number') {
      throw new Error(`Invalid stats payload: ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Campus Digital Twin & IoT Telemetry
  console.log('\n--- 2. CAMPUS DIGITAL TWIN & IOT TELEMETRY ---');
  await test('GET /digital-twin/zones (Query campus zones)', async () => {
    const res = await req('/digital-twin/zones?tenantId=1');
    if (res.status !== 200 || !Array.isArray(res.data.data) || res.data.data.length === 0) {
      throw new Error(`Expected zones array: ${JSON.stringify(res.data)}`);
    }
  });

  let stemZoneId = null;
  await test('GET /digital-twin/zones (Identify STEM Innovation Zone)', async () => {
    const res = await req('/digital-twin/zones?tenantId=1');
    const stem = res.data.data.find(z => z.zone_code === 'ZONE-STEM');
    if (!stem) throw new Error('STEM zone not found');
    stemZoneId = stem.id;
  });

  await test('PATCH /digital-twin/zones/:id/lock-status (Set zone lockdown)', async () => {
    const res = await req(`/digital-twin/zones/${stemZoneId}/lock-status`, {
      method: 'PATCH',
      body: JSON.stringify({
        tenantId: 1,
        lockStatus: 'LOCKDOWN'
      })
    });
    if (res.status !== 200 || res.data.data.lock_status !== 'LOCKDOWN') {
      throw new Error(`Failed to set lockdown status: ${JSON.stringify(res.data)}`);
    }
  });

  await test('PATCH /digital-twin/zones/:id/lock-status (Restore zone to SECURE)', async () => {
    const res = await req(`/digital-twin/zones/${stemZoneId}/lock-status`, {
      method: 'PATCH',
      body: JSON.stringify({
        tenantId: 1,
        lockStatus: 'SECURE'
      })
    });
    if (res.status !== 200 || res.data.data.lock_status !== 'SECURE') {
      throw new Error(`Failed to restore SECURE status: ${JSON.stringify(res.data)}`);
    }
  });

  await test('POST /digital-twin/telemetry (Record real-time IoT reading)', async () => {
    const res = await req('/digital-twin/telemetry', {
      method: 'POST',
      body: JSON.stringify({
        zoneId: stemZoneId,
        metricType: 'TEMPERATURE',
        metricValue: 22.1,
        unit: '°C'
      })
    });
    if (res.status !== 201 || !res.data.data.id) {
      throw new Error(`Telemetry log failed: ${JSON.stringify(res.data)}`);
    }
  });

  await test('GET /digital-twin/summary (Campus-wide environmental & occupancy aggregate)', async () => {
    const res = await req('/digital-twin/summary?tenantId=1');
    if (res.status !== 200 || typeof res.data.data.total_campus_occupancy !== 'number') {
      throw new Error(`Invalid digital twin summary: ${JSON.stringify(res.data)}`);
    }
  });

  // 3. CCTV & Gate Security
  console.log('\n--- 3. CCTV & GATE FACIAL SECURITY ---');
  await test('GET /cctv/streams (Query camera network)', async () => {
    const res = await req('/cctv/streams?tenantId=1');
    if (res.status !== 200 || !Array.isArray(res.data.data) || res.data.data.length === 0) {
      throw new Error(`Expected camera stream list: ${JSON.stringify(res.data)}`);
    }
  });

  await test('GET /cctv/events (Query gate facial scans and liveness ledger)', async () => {
    const res = await req('/cctv/events?tenantId=1');
    if (res.status !== 200 || !Array.isArray(res.data.data) || res.data.data.length === 0) {
      throw new Error(`Expected security gate events: ${JSON.stringify(res.data)}`);
    }
  });

  let newEventId = null;
  await test('POST /cctv/events (Record facial access verification)', async () => {
    const res = await req('/cctv/events', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 1,
        cameraId: 1,
        personName: 'Alexander Sterling',
        personRole: 'TEACHER',
        eventType: 'ACCESS_GRANTED',
        gateLocation: 'Faculty Turnstile West',
        matchConfidence: 99.2,
        livenessScore: 99.7
      })
    });
    if (res.status !== 201 || !res.data.data.id) {
      throw new Error(`Gate event not recorded: ${JSON.stringify(res.data)}`);
    }
    newEventId = res.data.data.id;
  });

  await test('PATCH /cctv/events/:id/flag (Toggle security event flag)', async () => {
    const res = await req(`/cctv/events/${newEventId}/flag`, {
      method: 'PATCH',
      body: JSON.stringify({
        tenantId: 1
      })
    });
    if (res.status !== 200 || res.data.data.is_flagged !== true) {
      throw new Error(`Event flagging failed: ${JSON.stringify(res.data)}`);
    }
  });

  await test('GET /cctv/stats (Query camera and event aggregate metrics)', async () => {
    const res = await req('/cctv/stats?tenantId=1');
    if (res.status !== 200 || !res.data.data.cameras || !res.data.data.events) {
      throw new Error(`Invalid CCTV stats payload: ${JSON.stringify(res.data)}`);
    }
  });

  // 4. Enterprise Data Migration
  console.log('\n--- 4. DATA MIGRATION & SYSTEM ETL ENGINE ---');
  await test('GET /migration/templates (Query standard CSV/Excel schema templates)', async () => {
    const res = await req('/migration/templates');
    if (res.status !== 200 || !res.data.data.STUDENTS) {
      throw new Error(`Missing migration templates: ${JSON.stringify(res.data)}`);
    }
  });

  let migrationJobId = null;
  await test('POST /migration/import (Execute batch data migration into PostgreSQL)', async () => {
    const res = await req('/migration/import', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 1,
        entityType: 'STUDENTS',
        filename: 'grade_10_incoming_students.csv',
        records: new Array(5).fill(0)
      })
    });
    if (res.status !== 201 || !res.data.data.id || res.data.data.processedCount < 1) {
      throw new Error(`Migration batch import failed: ${JSON.stringify(res.data)}`);
    }
    migrationJobId = res.data.data.id;
  });

  await test('GET /migration/jobs (Query migration batches ledger)', async () => {
    const res = await req('/migration/jobs?tenantId=1');
    if (res.status !== 200 || !Array.isArray(res.data.data) || res.data.data.length === 0) {
      throw new Error(`Expected migration jobs ledger: ${JSON.stringify(res.data)}`);
    }
  });

  await test('POST /migration/jobs/:id/rollback (Revert imported migration batch)', async () => {
    const res = await req(`/migration/jobs/${migrationJobId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 1
      })
    });
    if (res.status !== 200 || res.data.data.job.status !== 'ROLLED_BACK') {
      throw new Error(`Rollback failed: ${JSON.stringify(res.data)}`);
    }
  });

  // Summary
  console.log('\n====================================================');
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
