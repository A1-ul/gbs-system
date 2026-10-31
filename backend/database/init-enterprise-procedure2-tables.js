'use strict';

const prisma = require('../src/core/database/prisma.client');

async function initializeProcedure2Tables() {
  console.log('🚀 Initializing Enterprise Procedure 2 PostgreSQL Tables...');

  // 1. Library Tables
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS library_books (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      isbn VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
      shelf_location VARCHAR(100) DEFAULT 'Section A-1',
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_library_books_tenant_isbn UNIQUE (tenant_id, isbn)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS library_loans (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
      borrower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      borrower_name VARCHAR(255) NOT NULL,
      borrower_role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
      borrowed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      due_date TIMESTAMP WITH TIME ZONE NOT NULL,
      returned_at TIMESTAMP WITH TIME ZONE,
      status VARCHAR(50) NOT NULL DEFAULT 'BORROWED',
      fine_amount NUMERIC(10, 2) DEFAULT 0.00,
      fine_paid BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 2. Transport Tables
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS transport_routes (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      route_code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      start_location VARCHAR(255) NOT NULL,
      end_location VARCHAR(255) NOT NULL,
      stops TEXT NOT NULL,
      monthly_fare NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_transport_routes_tenant_code UNIQUE (tenant_id, route_code)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS transport_vehicles (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      registration_number VARCHAR(50) NOT NULL,
      model VARCHAR(100) NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 32,
      driver_name VARCHAR(255) NOT NULL,
      driver_phone VARCHAR(50) NOT NULL,
      assigned_route_id INTEGER REFERENCES transport_routes(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'OPERATIONAL',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_transport_vehicles_tenant_reg UNIQUE (tenant_id, registration_number)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS transport_assignments (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_name VARCHAR(255) NOT NULL,
      route_id INTEGER NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
      pickup_stop VARCHAR(255) NOT NULL,
      dropoff_stop VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 3. Inventory Tables
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      item_code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      unit VARCHAR(50) NOT NULL DEFAULT 'PIECES',
      quantity_on_hand INTEGER NOT NULL DEFAULT 0,
      reorder_level INTEGER NOT NULL DEFAULT 10,
      unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      location VARCHAR(100) DEFAULT 'Warehouse Section A',
      status VARCHAR(50) DEFAULT 'IN_STOCK',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_inventory_items_tenant_code UNIQUE (tenant_id, item_code)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS inventory_requests (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      request_number VARCHAR(50) NOT NULL,
      item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      item_name VARCHAR(255) NOT NULL,
      requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      requester_name VARCHAR(255) NOT NULL,
      department VARCHAR(100) DEFAULT 'ACADEMIC',
      quantity_requested INTEGER NOT NULL DEFAULT 1,
      urgency VARCHAR(50) DEFAULT 'MEDIUM',
      status VARCHAR(50) DEFAULT 'PENDING',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_inventory_requests_tenant_num UNIQUE (tenant_id, request_number)
    );
  `);

  // 4. HR Leave Tables
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS staff_leave_requests (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      staff_name VARCHAR(255) NOT NULL,
      staff_role VARCHAR(50) NOT NULL,
      leave_type VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      days_count INTEGER NOT NULL DEFAULT 1,
      reason TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP WITH TIME ZONE,
      rejection_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  console.log('✅ All Procedure 2 tables created successfully in PostgreSQL.');

  // Check tenants and seed authentic records
  const tenants = await prisma.tenant.findMany({ select: { id: true, code: true } });
  for (const tenant of tenants) {
    const tid = tenant.id;

    // Seed library books if empty
    const bookCount = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int as count FROM library_books WHERE tenant_id = $1', tid
    );
    if (bookCount[0].count === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO library_books (tenant_id, isbn, title, author, category, shelf_location, total_copies, available_copies)
        VALUES 
        (${tid}, '978-0134685991', 'Effective Java 3rd Edition', 'Joshua Bloch', 'COMPUTER_SCIENCE', 'Shelf CS-01', 12, 10),
        (${tid}, '978-0132350884', 'Clean Code: Agile Software Craftsmanship', 'Robert C. Martin', 'COMPUTER_SCIENCE', 'Shelf CS-02', 8, 6),
        (${tid}, '978-0321573513', 'Algorithms 4th Edition', 'Robert Sedgewick', 'MATHEMATICS', 'Shelf MATH-04', 15, 14),
        (${tid}, '978-0199535569', 'The Republic', 'Plato', 'PHILOSOPHY', 'Shelf PHIL-01', 10, 9),
        (${tid}, '978-0062316097', 'Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', 'HISTORY', 'Shelf HIST-02', 20, 18),
        (${tid}, '978-1400033416', 'Beloved', 'Toni Morrison', 'LITERATURE', 'Shelf LIT-03', 14, 12);
      `);
      console.log(`📚 Seeded default Library Books for Tenant ${tid}`);
    }

    // Seed transport routes if empty
    const routeCount = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int as count FROM transport_routes WHERE tenant_id = $1', tid
    );
    if (routeCount[0].count === 0) {
      const stopsA = JSON.stringify([
        { name: 'Central Station Terminal', time: '06:45 AM' },
        { name: 'Riverside North Gate', time: '07:05 AM' },
        { name: 'Maplewood Heights', time: '07:20 AM' },
        { name: 'GBS Main Campus West Entrance', time: '07:40 AM' }
      ]);
      const stopsB = JSON.stringify([
        { name: 'East Hills Community Plaza', time: '06:50 AM' },
        { name: 'Sunnyside Boulevard 14th', time: '07:10 AM' },
        { name: 'Oakland Tech Park', time: '07:25 AM' },
        { name: 'GBS Main Campus East Gate', time: '07:45 AM' }
      ]);

      await prisma.$executeRawUnsafe(`
        INSERT INTO transport_routes (tenant_id, route_code, name, start_location, end_location, stops, monthly_fare, status)
        VALUES 
        (${tid}, 'RT-NORTH-01', 'North Campus Express Line', 'Central Station Terminal', 'GBS Main Campus', '${stopsA}', 175.00, 'ACTIVE'),
        (${tid}, 'RT-EAST-02', 'East Valley Shuttle Line', 'East Hills Community Plaza', 'GBS Main Campus', '${stopsB}', 160.00, 'ACTIVE');
      `);

      const r1 = await prisma.$queryRawUnsafe('SELECT id FROM transport_routes WHERE tenant_id = $1 AND route_code = $2', tid, 'RT-NORTH-01');
      const r2 = await prisma.$queryRawUnsafe('SELECT id FROM transport_routes WHERE tenant_id = $1 AND route_code = $2', tid, 'RT-EAST-02');

      await prisma.$executeRawUnsafe(`
        INSERT INTO transport_vehicles (tenant_id, registration_number, model, capacity, driver_name, driver_phone, assigned_route_id, status)
        VALUES 
        (${tid}, 'BUS-2026-N1', 'Mercedes-Benz Sprinter 32-Seater', 32, 'Michael Henderson', '+1 555-019-2831', ${r1[0].id}, 'OPERATIONAL'),
        (${tid}, 'BUS-2026-E2', 'Volvo B8R Intercity 44-Seater', 44, 'Arthur Pendelton', '+1 555-019-8742', ${r2[0].id}, 'OPERATIONAL');
      `);
      console.log(`🚌 Seeded default Transport Routes & Vehicles for Tenant ${tid}`);
    }

    // Seed inventory items if empty
    const itemCount = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int as count FROM inventory_items WHERE tenant_id = $1', tid
    );
    if (itemCount[0].count === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO inventory_items (tenant_id, item_code, name, category, unit, quantity_on_hand, reorder_level, unit_price, location, status)
        VALUES 
        (${tid}, 'INV-SCI-01', 'Borosilicate Glass Beaker 250ml', 'LAB_SUPPLIES', 'PIECES', 45, 15, 12.50, 'Science Storeroom B2', 'IN_STOCK'),
        (${tid}, 'INV-SCI-02', 'Compound Optical Microscope 1000x', 'LAB_SUPPLIES', 'PIECES', 8, 5, 340.00, 'Lab Equipment Cabinet 1', 'IN_STOCK'),
        (${tid}, 'INV-STA-01', 'A4 College Ruled Notebook 100 Pgs', 'STATIONERY', 'BOXES', 120, 30, 4.25, 'Main Supply Depot Bay 3', 'IN_STOCK'),
        (${tid}, 'INV-STA-02', 'Dry Erase Whiteboard Markers (Assorted 4-Pack)', 'STATIONERY', 'PACKS', 22, 25, 6.80, 'Main Supply Depot Bay 1', 'LOW_STOCK'),
        (${tid}, 'INV-IT-01', 'Dell Latitude 3440 Student Laptop', 'IT_EQUIPMENT', 'PIECES', 35, 10, 650.00, 'Secure IT Vault A', 'IN_STOCK'),
        (${tid}, 'INV-IT-02', 'Cat6 Gigabit Ethernet Patch Cable 3m', 'IT_EQUIPMENT', 'PIECES', 75, 20, 8.90, 'Network Cabling Rack', 'IN_STOCK');
      `);
      console.log(`📦 Seeded default Inventory Items for Tenant ${tid}`);
    }

    // Seed sample staff leave request if empty
    const leaveCount = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int as count FROM staff_leave_requests WHERE tenant_id = $1', tid
    );
    if (leaveCount[0].count === 0) {
      const teacher = await prisma.user.findFirst({ where: { tenantId: tid, role: 'TEACHER' } });
      if (teacher) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO staff_leave_requests (tenant_id, staff_id, staff_name, staff_role, leave_type, start_date, end_date, days_count, reason, status)
          VALUES 
          (${tid}, ${teacher.id}, '${teacher.name}', '${teacher.role}', 'ANNUAL', '2026-11-01', '2026-11-05', 5, 'Annual professional development conference attendance', 'APPROVED');
        `);
        console.log(`👔 Seeded default Staff Leave Request for Tenant ${tid}`);
      }
    }
  }

  await prisma.$disconnect();
  console.log('🎉 Enterprise Procedure 2 database initialization finished successfully!');
}

initializeProcedure2Tables().catch(err => {
  console.error('❌ Error initializing Procedure 2 tables:', err);
  process.exit(1);
});
