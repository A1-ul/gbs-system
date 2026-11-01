const { Client } = require('pg');

async function setupMissingTables() {
  const client = new Client('postgresql://postgres:Admin123@localhost:5432/gbs_system');
  await client.connect();
  console.log('Connected to PostgreSQL for System Tables Setup...');

  // 1. Inventory Items & Requests
  await client.query(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      item_code VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      unit VARCHAR(50) DEFAULT 'PIECES',
      quantity_on_hand INTEGER DEFAULT 0,
      reorder_level INTEGER DEFAULT 10,
      unit_price NUMERIC(10,2) DEFAULT 0.00,
      location VARCHAR(150),
      status VARCHAR(50) DEFAULT 'IN_STOCK',
      purchased_by_staff VARCHAR(150),
      purchaser_dept VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_inv_tenant ON inventory_items(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_inv_code ON inventory_items(item_code);

    CREATE TABLE IF NOT EXISTS inventory_requests (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      request_number VARCHAR(100) UNIQUE NOT NULL,
      item_id INTEGER,
      item_name VARCHAR(255),
      requester_id INTEGER,
      requester_name VARCHAR(150),
      department VARCHAR(100),
      quantity_requested INTEGER DEFAULT 1,
      urgency VARCHAR(50) DEFAULT 'MEDIUM',
      status VARCHAR(50) DEFAULT 'PENDING',
      notes TEXT,
      reviewed_by VARCHAR(150),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_inv_req_tenant ON inventory_requests(tenant_id);
  `);
  console.log('✅ inventory_items & inventory_requests tables verified');

  // Seed baseline inventory items if empty
  const itemCount = await client.query('SELECT COUNT(*) FROM inventory_items');
  if (parseInt(itemCount.rows[0].count, 10) === 0) {
    await client.query(`
      INSERT INTO inventory_items (tenant_id, item_code, name, category, unit, quantity_on_hand, reorder_level, unit_price, location, status, purchased_by_staff, purchaser_dept)
      VALUES
        (1, 'INV-SCI-001', 'Digital Precision Microscope (1000x HD)', 'LABORATORY', 'UNITS', 25, 5, 450.00, 'Science Block Room 102', 'IN_STOCK', 'Mr. Samuel Adjei (Procurement Officer)', 'Science Department'),
        (1, 'INV-STA-002', 'Premium A4 Multipurpose Copy Paper (Ream)', 'STATIONERY', 'REAMS', 120, 20, 35.00, 'Central Warehouse Section B', 'IN_STOCK', 'Mr. Samuel Adjei (Procurement Officer)', 'Administration'),
        (1, 'INV-IT-003', 'Cat6 Ethernet High-Speed Patch Cable (50m)', 'IT_EQUIPMENT', 'ROLLS', 18, 5, 85.00, 'IT Server Vault', 'IN_STOCK', 'Mr. Samuel Adjei (Procurement Officer)', 'IT Operations');
    `);
    console.log('Seeded baseline inventory items');
  }

  // 2. Staff Leave Requests
  await client.query(`
    CREATE TABLE IF NOT EXISTS staff_leave_requests (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      staff_id INTEGER,
      staff_name VARCHAR(150),
      staff_role VARCHAR(50) DEFAULT 'STAFF',
      leave_type VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      days_count INTEGER DEFAULT 1,
      reason TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      reviewed_by VARCHAR(150),
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_leave_tenant ON staff_leave_requests(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_leave_staff ON staff_leave_requests(staff_id);
  `);
  console.log('✅ staff_leave_requests table verified');

  // 3. Institution Registrations Columns
  await client.query(`
    ALTER TABLE institution_registrations
      ADD COLUMN IF NOT EXISTS "totalStudentsEnrolled" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "perStudentRate" NUMERIC(10,2) DEFAULT 5.00,
      ADD COLUMN IF NOT EXISTS "calculatedBaseFee" NUMERIC(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS "subscriptionPlan" VARCHAR(50) DEFAULT '1_MONTH_TRIAL',
      ADD COLUMN IF NOT EXISTS "paymentAmount" VARCHAR(50) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS "momoTxnId" VARCHAR(100) DEFAULT 'FREE_TRIAL_AUTO',
      ADD COLUMN IF NOT EXISTS "hasUsedTrial" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN DEFAULT false;
  `);
  console.log('✅ institution_registrations columns verified');

  // 4. Attendance Archives Table (for Teacher archive feature)
  await client.query(`
    CREATE TABLE IF NOT EXISTS attendance_archives (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      teacher_id INTEGER,
      teacher_name VARCHAR(150),
      class_id INTEGER,
      class_name VARCHAR(150),
      academic_week VARCHAR(50),
      term VARCHAR(50),
      academic_year VARCHAR(50),
      total_students INTEGER DEFAULT 0,
      present_count INTEGER DEFAULT 0,
      absent_count INTEGER DEFAULT 0,
      late_count INTEGER DEFAULT 0,
      excused_count INTEGER DEFAULT 0,
      attendance_percentage NUMERIC(5,2) DEFAULT 100.0,
      headmaster_approved BOOLEAN DEFAULT TRUE,
      approved_by VARCHAR(150) DEFAULT 'Headmaster',
      approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_att_arch_tenant ON attendance_archives(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_att_arch_teacher ON attendance_archives(teacher_id);
  `);
  console.log('✅ attendance_archives table verified');

  await client.end();
  console.log('🎉 Missing tables & columns successfully configured in PostgreSQL!');
}

setupMissingTables().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
