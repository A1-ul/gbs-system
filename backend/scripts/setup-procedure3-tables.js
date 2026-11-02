const { Client } = require('pg');

async function setupProcedure3Tables() {
  const client = new Client('postgresql://postgres:Admin123@localhost:5432/gbs_system');
  await client.connect();
  console.log('Connected to PostgreSQL for Procedure 3 Schema Setup...');

  // 1. Facility Tickets / Maintenance Work Orders
  await client.query(`
    CREATE TABLE IF NOT EXISTS facility_tickets (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      ticket_number VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      location VARCHAR(150) NOT NULL,
      priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      estimated_cost NUMERIC(10,2) DEFAULT 0.00,
      actual_cost NUMERIC(10,2) DEFAULT 0.00,
      assigned_staff VARCHAR(100),
      reported_by VARCHAR(100),
      resolution_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_fac_tenant ON facility_tickets(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_fac_status ON facility_tickets(status);
  `);
  console.log('✅ facility_tickets table ready');

  // 2. Campus Digital Twin & IoT Telemetry
  await client.query(`
    CREATE TABLE IF NOT EXISTS campus_zones (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      zone_code VARCHAR(50) UNIQUE NOT NULL,
      zone_name VARCHAR(150) NOT NULL,
      building VARCHAR(100) NOT NULL,
      floor_level VARCHAR(50) DEFAULT 'Ground Floor',
      max_capacity INTEGER DEFAULT 120,
      current_occupancy INTEGER DEFAULT 0,
      lock_status VARCHAR(30) DEFAULT 'SECURE',
      power_consumption_kw NUMERIC(8,2) DEFAULT 14.5,
      temperature_celsius NUMERIC(5,2) DEFAULT 22.4,
      humidity_percent NUMERIC(5,2) DEFAULT 46.0,
      air_quality_index INTEGER DEFAULT 24,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_cz_tenant ON campus_zones(tenant_id);

    CREATE TABLE IF NOT EXISTS campus_telemetry_logs (
      id SERIAL PRIMARY KEY,
      zone_id INTEGER REFERENCES campus_zones(id) ON DELETE CASCADE,
      metric_type VARCHAR(50) NOT NULL,
      metric_value NUMERIC(10,2) NOT NULL,
      unit VARCHAR(20),
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ctl_zone ON campus_telemetry_logs(zone_id);
  `);
  console.log('✅ campus_zones and campus_telemetry_logs tables ready');

  // 3. CCTV Streams & Gate Security Events
  await client.query(`
    CREATE TABLE IF NOT EXISTS cctv_streams (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      camera_code VARCHAR(50) UNIQUE NOT NULL,
      camera_name VARCHAR(150) NOT NULL,
      location VARCHAR(150) NOT NULL,
      stream_url VARCHAR(255) NOT NULL,
      resolution VARCHAR(50) DEFAULT '1080p 60FPS',
      status VARCHAR(30) DEFAULT 'ONLINE',
      ip_address VARCHAR(50),
      ai_detection_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_cctv_tenant ON cctv_streams(tenant_id);

    CREATE TABLE IF NOT EXISTS security_gate_events (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      event_id VARCHAR(50) UNIQUE NOT NULL,
      camera_id INTEGER REFERENCES cctv_streams(id) ON DELETE SET NULL,
      person_name VARCHAR(150) NOT NULL,
      person_role VARCHAR(50) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      gate_location VARCHAR(150) NOT NULL,
      match_confidence NUMERIC(5,2) NOT NULL,
      liveness_score NUMERIC(5,2) NOT NULL,
      snapshot_url VARCHAR(255),
      is_flagged BOOLEAN DEFAULT FALSE,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sge_tenant ON security_gate_events(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sge_event_type ON security_gate_events(event_type);
  `);
  console.log('✅ cctv_streams and security_gate_events tables ready');

  // 4. Seed baseline data if empty
  const facCount = await client.query('SELECT COUNT(*) FROM facility_tickets');
  if (parseInt(facCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO facility_tickets (tenant_id, ticket_number, title, category, location, priority, status, estimated_cost, assigned_staff, reported_by)
      VALUES 
      (1, 'TKT-2026-001', 'HVAC Temperature Sensor Calibration', 'HVAC', 'STEM Lab 302', 'HIGH', 'IN_PROGRESS', 350.00, 'Marcus Vance (Facilities Lead)', 'Dr. Alan Walker'),
      (1, 'TKT-2026-002', 'Smart Projector Bulb Replacement', 'IT_HARDWARE', 'Lecture Hall 1A', 'MEDIUM', 'APPROVED', 180.00, 'David Kross (IT Technician)', 'Elena Rostova'),
      (1, 'TKT-2026-003', 'Hydrophonic Garden Water Line Inspection', 'PLUMBING', 'Agricultural Complex', 'LOW', 'PENDING', 120.00, 'Marcus Vance (Facilities Lead)', 'Campus Operations'),
      (1, 'TKT-2026-004', 'West Perimeter Gate Magnetic Latch Servicing', 'SAFETY', 'West Access Turnstile', 'URGENT', 'RESOLVED', 450.00, 'Security Engineering', 'Capt. Miller');
    `);
    console.log('Seeded initial facility work orders');
  }

  const zoneCount = await client.query('SELECT COUNT(*) FROM campus_zones');
  if (parseInt(zoneCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO campus_zones (tenant_id, zone_code, zone_name, building, floor_level, max_capacity, current_occupancy, lock_status, power_consumption_kw, temperature_celsius, humidity_percent, air_quality_index)
      VALUES
      (1, 'ZONE-STEM', 'STEM Innovation Pavilion', 'Edison Technology Center', '2nd Floor', 160, 114, 'SECURE', 28.40, 21.8, 44.0, 18),
      (1, 'ZONE-ADMIN', 'Central Administration & Bursar Enclave', 'Founder Memorial Hall', '1st Floor', 80, 42, 'SECURE', 14.20, 22.5, 48.0, 22),
      (1, 'ZONE-LIB', 'Sir Isaac Newton Digital Library', 'Athenaeum Block', 'Ground & 1st', 250, 185, 'SECURE', 22.10, 21.2, 42.0, 15),
      (1, 'ZONE-SPORTS', 'Olympic Aquatic & Athletic Complex', 'Fieldhouse Pavilion', 'Ground Level', 500, 210, 'OPEN', 64.80, 24.0, 58.0, 31),
      (1, 'ZONE-GATE-N', 'North Ceremonial Campus Gate & Turnstiles', 'Perimeter Gatehouse', 'Exterior Ground', 1200, 340, 'SECURE', 18.60, 23.5, 50.0, 38);
    `);
    console.log('Seeded initial campus zones');
  }

  const camCount = await client.query('SELECT COUNT(*) FROM cctv_streams');
  if (parseInt(camCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO cctv_streams (tenant_id, camera_code, camera_name, location, stream_url, rtsp_endpoint, resolution, status, ip_address)
      VALUES
      (1, 'CAM-GATE-01', 'North Gate High-Speed ANPR & Facial Scanner', 'North Main Gatehouse', 'rtsp://stream.gbs-system.edu/live/cam_gate_01', 'rtsp://stream.gbs-system.edu/live/cam_gate_01', '4K UltraHD 60FPS', 'RECORDING', '192.168.10.101'),
      (1, 'CAM-STEM-02', 'STEM Robotics Arena Overhead Feed', 'Edison Hall Room 204', 'rtsp://stream.gbs-system.edu/live/cam_stem_02', 'rtsp://stream.gbs-system.edu/live/cam_stem_02', '1080p 60FPS', 'ONLINE', '192.168.10.102'),
      (1, 'CAM-LIB-01', 'Library Central Reading Room Panoramic', 'Sir Isaac Newton Library', 'rtsp://stream.gbs-system.edu/live/cam_lib_01', 'rtsp://stream.gbs-system.edu/live/cam_lib_01', '1080p 30FPS', 'RECORDING', '192.168.10.103'),
      (1, 'CAM-QUAD-01', 'Academic Quadrangle Main Promenade', 'Central Campus Park', 'rtsp://stream.gbs-system.edu/live/cam_quad_01', 'rtsp://stream.gbs-system.edu/live/cam_quad_01', '4K UltraHD 60FPS', 'ONLINE', '192.168.10.104'),
      (1, 'CAM-BURSAR-01', 'Bursar & Finance Vault Access Camera', 'Admin Hall Suite 108', 'rtsp://stream.gbs-system.edu/live/cam_bursar_01', 'rtsp://stream.gbs-system.edu/live/cam_bursar_01', '1080p 60FPS', 'RECORDING', '192.168.10.105');
    `);
    console.log('Seeded initial CCTV cameras');
  }

  const eventCount = await client.query('SELECT COUNT(*) FROM security_gate_events');
  if (parseInt(eventCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO security_gate_events (tenant_id, event_id, camera_id, person_name, person_role, event_type, gate_location, gate_name, match_confidence, liveness_score, is_flagged)
      VALUES
      (1, 'SGE-2026-901', 1, 'Julian Vance', 'STUDENT', 'ACCESS_GRANTED', 'North Turnstile #1', 'North Turnstile #1', 99.4, 99.8, false),
      (1, 'SGE-2026-902', 1, 'Dr. Alan Walker', 'TEACHER', 'ACCESS_GRANTED', 'Faculty Express Lane', 'Faculty Express Lane', 98.9, 99.5, false),
      (1, 'SGE-2026-903', 1, 'Unrecognized Visitor', 'UNKNOWN', 'ACCESS_DENIED', 'Visitor Gate B', 'Visitor Gate B', 42.1, 88.0, true),
      (1, 'SGE-2026-904', 1, 'Marcus Vance', 'STAFF', 'ACCESS_GRANTED', 'Service Entry Gate', 'Service Entry Gate', 99.1, 99.2, false);
    `);
    console.log('Seeded initial security gate events');
  }

  await client.end();
  console.log('🎉 Procedure 3 PostgreSQL schema & baseline datasets verified successfully!');
}

setupProcedure3Tables().catch(err => {
  console.error('Schema setup error:', err);
  process.exit(1);
});
