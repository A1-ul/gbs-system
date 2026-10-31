const prisma = require('./src/core/database/prisma.client');

async function updateStaff() {
  await prisma.$executeRawUnsafe(`
    UPDATE inventory_items 
    SET purchased_by_staff = CASE 
      WHEN category = 'LAB_SUPPLIES' THEN 'Dr. Evelyn Reed (Head of Sciences)'
      WHEN category = 'STATIONERY' THEN 'Mrs. Margaret Ofori (Academic Supplies Officer)'
      WHEN category = 'IT_EQUIPMENT' THEN 'Mr. Kwabena Asante (Lead Systems Admin)'
      WHEN category = 'SPORTS' THEN 'Coach Emmanuel Mensah (Director of Athletics)'
      WHEN category = 'FACILITY_MAINTENANCE' THEN 'Mr. Jonathan Vance (Head of Maintenance)'
      ELSE 'Mr. Samuel Adjei (Director of Procurement)'
    END,
    purchaser_dept = CASE
      WHEN category = 'LAB_SUPPLIES' THEN 'Faculty of Sciences'
      WHEN category = 'STATIONERY' THEN 'Academic Affairs'
      WHEN category = 'IT_EQUIPMENT' THEN 'Information Technology'
      WHEN category = 'SPORTS' THEN 'Physical Education'
      WHEN category = 'FACILITY_MAINTENANCE' THEN 'Operations & Estates'
      ELSE 'Procurement Depot'
    END
    WHERE purchased_by_staff IS NULL;
  `);
  console.log('UPDATED INVENTORY PURCHASER STAFF DETAILS SUCCESSFULLY');
}

updateStaff().catch(console.error).finally(() => prisma.$disconnect());
