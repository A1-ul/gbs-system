'use strict';

const prisma = require('../../core/database/prisma.client');
const logger = require('../../utils/logger') || console;

let tablesEnsured = false;
let ensurePromise = null;
const emptiedTenantsByDelete = new Set();

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

function toSafeInt(val, fallback = 1) {
  if (typeof val === 'number' && Number.isFinite(val)) return Math.trunc(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    const direct = parseInt(trimmed, 10);
    if (!Number.isNaN(direct) && String(direct) === trimmed) return direct;
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length > 0) {
      const parsed = parseInt(digits.slice(-7), 10);
      if (parsed > 0) return parsed;
    }
    let hash = 0;
    for (let i = 0; i < trimmed.length; i++) {
      hash = ((hash << 5) - hash + trimmed.charCodeAt(i)) | 0;
    }
    return (Math.abs(hash) % 8900000) + 1000;
  }
  return fallback;
}

function parseStops(rawStops) {
  if (Array.isArray(rawStops)) return rawStops;
  if (typeof rawStops === 'string') {
    const trimmed = rawStops.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      return trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, time: 'Scheduled' }));
    }
  }
  return [];
}

/**
 * Ensures transport PostgreSQL tables exist cleanly when PG is online.
 */
async function ensureTransportTables() {
  if (tablesEnsured) return true;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    try {
      if (typeof prisma.isPostgresOnline === 'function') {
        const online = await prisma.isPostgresOnline();
        if (!online) {
          tablesEnsured = true;
          return true;
        }
      }

      const ddl = [
        `CREATE TABLE IF NOT EXISTS transport_routes (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          route_code VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          start_location VARCHAR(255) NOT NULL,
          end_location VARCHAR(255) NOT NULL,
          stops TEXT NOT NULL DEFAULT '[]',
          monthly_fare DECIMAL(10,2) NOT NULL DEFAULT 150.00,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_transport_routes_tenant_code UNIQUE (tenant_id, route_code)
        )`,
        `CREATE TABLE IF NOT EXISTS transport_vehicles (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          registration_number VARCHAR(50) NOT NULL,
          model VARCHAR(100) NOT NULL,
          capacity INTEGER NOT NULL DEFAULT 32,
          driver_name VARCHAR(255) NOT NULL,
          driver_phone VARCHAR(50) NOT NULL,
          assigned_route_id INTEGER REFERENCES transport_routes(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'OPERATIONAL',
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_transport_vehicles_tenant_reg UNIQUE (tenant_id, registration_number)
        )`,
        `CREATE TABLE IF NOT EXISTS transport_assignments (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          student_id INTEGER NOT NULL,
          student_name VARCHAR(255) NOT NULL,
          route_id INTEGER NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
          pickup_stop VARCHAR(255) NOT NULL,
          dropoff_stop VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      for (const stmt of ddl) {
        try {
          await prisma.$executeRawUnsafe(stmt);
        } catch (err) {
          if (logger.warn) logger.warn('ENSURE_TRANSPORT_TABLES_NOTICE', { error: err.message });
        }
      }
      tablesEnsured = true;
      return true;
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}

const DEFAULT_DEMO_ROUTES = [
  {
    route_code: 'RT-EL-01',
    name: 'East Legon Enclave Express',
    start_location: 'East Legon / American House',
    end_location: 'GBS Main Campus',
    stops: JSON.stringify([
      { name: 'American House Junction', time: '06:25 AM' },
      { name: 'A&C Mall Roundabout', time: '06:35 AM' },
      { name: 'Shell Station Gate', time: '06:45 AM' }
    ]),
    monthly_fare: 450.0,
    status: 'ACTIVE'
  },
  {
    route_code: 'RT-AR-02',
    name: 'Airport Residential & Ridge Corridor',
    start_location: 'Airport Roundabout',
    end_location: 'GBS Main Campus',
    stops: JSON.stringify([
      { name: 'Airport Roundabout Stop', time: '06:30 AM' },
      { name: '37 Military Station', time: '06:45 AM' },
      { name: 'Ridge Circle Stop', time: '06:55 AM' }
    ]),
    monthly_fare: 550.0,
    status: 'ACTIVE'
  },
  {
    route_code: 'RT-SP-03',
    name: 'Spintex Road & Batsonaa Link',
    start_location: 'Batsonaa Total Junction',
    end_location: 'GBS Main Campus',
    stops: JSON.stringify([
      { name: 'Batsonaa Total Junction', time: '06:15 AM' },
      { name: 'Spintex Coastal Junction', time: '06:28 AM' },
      { name: 'Junction Mall Gate', time: '06:40 AM' }
    ]),
    monthly_fare: 650.0,
    status: 'ACTIVE'
  },
  {
    route_code: 'RT-MA-04',
    name: 'Madina & Adenta Hills Line',
    start_location: 'Adenta Barrier',
    end_location: 'GBS Main Campus',
    stops: JSON.stringify([
      { name: 'Adenta Barrier Pickup', time: '06:10 AM' },
      { name: 'Madina Zongo Junction', time: '06:25 AM' },
      { name: 'Atomic Junction', time: '06:40 AM' }
    ]),
    monthly_fare: 650.0,
    status: 'ACTIVE'
  },
  {
    route_code: 'RT-TM-05',
    name: 'Tema Community 25 Express',
    start_location: 'Tema Comm 25 Mall',
    end_location: 'GBS Main Campus',
    stops: JSON.stringify([
      { name: 'Community 25 Mall Gate', time: '06:00 AM' },
      { name: 'Community 1 Roundabout', time: '06:18 AM' },
      { name: 'Motorway Toll Gate', time: '06:35 AM' }
    ]),
    monthly_fare: 800.0,
    status: 'ACTIVE'
  }
];

async function seedDemoTransportIfEmpty(tenantId = 1) {
  const tid = toSafeInt(tenantId, 1);
  if (tid !== 1 || emptiedTenantsByDelete.has(tid)) return;

  await ensureTransportTables();
  const existingRoutes = await prisma.transportRoute.findMany({ where: { tenant_id: tid } });
  if (existingRoutes.length > 0) return;

  const createdRoutes = [];
  for (const r of DEFAULT_DEMO_ROUTES) {
    try {
      const rec = await prisma.transportRoute.create({
        data: { tenant_id: tid, ...r }
      });
      createdRoutes.push(rec);
    } catch (_) {
      // ignore if another concurrent request seeded simultaneously
    }
  }

  const allRoutes = createdRoutes.length > 0
    ? createdRoutes
    : await prisma.transportRoute.findMany({ where: { tenant_id: tid } });

  const existingVehicles = await prisma.transportVehicle.findMany({ where: { tenant_id: tid } });
  if (existingVehicles.length === 0 && allRoutes.length > 0) {
    const starterVehicles = [
      {
        registration_number: 'GBS-BUS-01',
        model: 'Toyota Coaster 32-Seater',
        capacity: 32,
        driver_name: 'Mr. Emmanuel Tetteh',
        driver_phone: '+233 24 111 2233',
        assigned_route_id: allRoutes[0]?.id || null,
        status: 'OPERATIONAL'
      },
      {
        registration_number: 'GBS-BUS-02',
        model: 'Nissan Civilian 28-Seater',
        capacity: 28,
        driver_name: 'Mr. Isaac Mensah',
        driver_phone: '+233 20 222 3344',
        assigned_route_id: allRoutes[2]?.id || allRoutes[0]?.id || null,
        status: 'OPERATIONAL'
      },
      {
        registration_number: 'GBS-BUS-03',
        model: 'Mercedes Sprinter 22-Seater',
        capacity: 22,
        driver_name: 'Mr. Samuel Darko',
        driver_phone: '+233 24 999 0011',
        assigned_route_id: allRoutes[4]?.id || allRoutes[0]?.id || null,
        status: 'OPERATIONAL'
      }
    ];
    for (const v of starterVehicles) {
      try {
        await prisma.transportVehicle.create({ data: { tenant_id: tid, ...v } });
      } catch (_) {}
    }
  }

  const existingAssignments = await prisma.transportAssignment.findMany({ where: { tenant_id: tid } });
  if (existingAssignments.length === 0 && allRoutes.length > 0) {
    const starterAssignments = [
      {
        student_id: 3,
        student_name: 'Julian Bramwell',
        route_id: allRoutes[0].id,
        pickup_stop: 'American House Junction',
        dropoff_stop: 'GBS Main Campus',
        status: 'ACTIVE'
      },
      {
        student_id: 1001,
        student_name: 'Emmanuel Mensah',
        route_id: allRoutes[1]?.id || allRoutes[0].id,
        pickup_stop: 'Airport Roundabout Stop',
        dropoff_stop: 'GBS Main Campus',
        status: 'ACTIVE'
      },
      {
        student_id: 1002,
        student_name: 'Ama Serwaa',
        route_id: allRoutes[2]?.id || allRoutes[0].id,
        pickup_stop: 'Batsonaa Total Junction',
        dropoff_stop: 'GBS Main Campus',
        status: 'ACTIVE'
      }
    ];
    for (const a of starterAssignments) {
      try {
        await prisma.transportAssignment.create({ data: { tenant_id: tid, ...a } });
      } catch (_) {}
    }
  }
}

async function getRoutes(tenantId = 1) {
  try {
    const tid = toSafeInt(tenantId, 1);
    await seedDemoTransportIfEmpty(tid);

    const [routes, vehicles, assignments] = await Promise.all([
      prisma.transportRoute.findMany({ where: { tenant_id: tid }, orderBy: { id: 'asc' } }),
      prisma.transportVehicle.findMany({ where: { tenant_id: tid } }),
      prisma.transportAssignment.findMany({ where: { tenant_id: tid } })
    ]);

    const formatted = routes.map((r) => {
      const routeId = toSafeInt(r.id, 0);
      const vehiclesCount = vehicles.filter((v) => toSafeInt(v.assigned_route_id, -1) === routeId).length;
      const enrolledCount = assignments.filter(
        (a) => toSafeInt(a.route_id, -1) === routeId && String(a.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
      ).length;
      return {
        ...r,
        monthly_fare: Number(r.monthly_fare || 0),
        stops: parseStops(r.stops),
        vehicles_count: vehiclesCount,
        enrolled_students: enrolledCount
      };
    });

    return success({ count: formatted.length, records: formatted });
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_GET_ROUTES_ERROR', { error: error.message });
    return failure('Failed to retrieve transport routes');
  }
}

async function createRoute(payload, tenantId = 1) {
  try {
    const tid = toSafeInt(tenantId, 1);
    await ensureTransportTables();
    const { routeCode, name, startLocation, endLocation, stops, monthlyFare } = payload || {};

    const cleanCode = String(routeCode || '').trim().toUpperCase();
    const cleanName = String(name || '').trim();
    const cleanStart = String(startLocation || '').trim();
    const cleanEnd = String(endLocation || 'GBS Main Campus').trim();

    if (!cleanCode || !cleanName || !cleanStart || !cleanEnd) {
      return failure('Route code, name, start location, and end location are required');
    }

    const existing = await prisma.transportRoute.findFirst({
      where: { tenant_id: tid, route_code: cleanCode }
    });
    if (existing) {
      return failure(`Route code "${cleanCode}" already exists for your school`);
    }

    const parsedStops = parseStops(stops);
    const stopsJson = JSON.stringify(parsedStops);
    const fare = parseFloat(monthlyFare);
    const safeFare = Number.isFinite(fare) && fare >= 0 ? fare : 150.0;

    emptiedTenantsByDelete.delete(tid);
    const created = await prisma.transportRoute.create({
      data: {
        tenant_id: tid,
        route_code: cleanCode,
        name: cleanName,
        start_location: cleanStart,
        end_location: cleanEnd,
        stops: stopsJson,
        monthly_fare: safeFare,
        status: 'ACTIVE'
      }
    });

    return success(
      {
        ...created,
        monthly_fare: Number(created.monthly_fare || safeFare),
        stops: parsedStops
      },
      `Transport route ${cleanCode} created successfully`
    );
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_CREATE_ROUTE_ERROR', { error: error.message });
    return failure(String(error.message || '').toLowerCase().includes('unique') ? 'Route code already exists' : 'Failed to create route');
  }
}

async function deleteRoute(routeId, tenantId = 1) {
  try {
    const tid = toSafeInt(tenantId, 1);
    const rid = toSafeInt(routeId, 0);
    if (!rid) return failure('Valid route ID is required');

    await ensureTransportTables();
    const existing = await prisma.transportRoute.findFirst({ where: { id: rid, tenant_id: tid } });
    if (!existing) return failure('Transport route not found for this institution');

    await prisma.transportAssignment.deleteMany({ where: { route_id: rid, tenant_id: tid } });
    await prisma.transportVehicle.updateMany({
      where: { assigned_route_id: rid, tenant_id: tid },
      data: { assigned_route_id: null }
    });
    await prisma.transportRoute.delete({ where: { id: rid } });

    const remaining = await prisma.transportRoute.findMany({ where: { tenant_id: tid } });
    if (remaining.length === 0) {
      emptiedTenantsByDelete.add(tid);
    }

    return success({ deletedId: rid }, `Route "${existing.name}" removed from fleet schedule`);
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_DELETE_ROUTE_ERROR', { error: error.message });
    return failure('Failed to delete transport route');
  }
}

async function getVehicles(tenantId = 1) {
  try {
    const tid = toSafeInt(tenantId, 1);
    await seedDemoTransportIfEmpty(tid);

    const [vehicles, routes] = await Promise.all([
      prisma.transportVehicle.findMany({ where: { tenant_id: tid }, orderBy: { id: 'asc' } }),
      prisma.transportRoute.findMany({ where: { tenant_id: tid } })
    ]);

    const routeById = new Map(routes.map((r) => [toSafeInt(r.id, 0), r]));
    const formatted = vehicles.map((v) => {
      const route = v.assigned_route_id ? routeById.get(toSafeInt(v.assigned_route_id, 0)) : null;
      return {
        ...v,
        capacity: toSafeInt(v.capacity, 32),
        route_name: route?.name || null,
        route_code: route?.route_code || null
      };
    });

    return success({ count: formatted.length, records: formatted });
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_GET_VEHICLES_ERROR', { error: error.message });
    return failure('Failed to retrieve transport fleet vehicles');
  }
}

async function createVehicle(payload, tenantId = 1) {
  try {
    const tid = toSafeInt(tenantId, 1);
    await ensureTransportTables();
    const { registrationNumber, model, capacity, driverName, driverPhone, assignedRouteId } = payload || {};

    const cleanReg = String(registrationNumber || '').trim().toUpperCase();
    const cleanModel = String(model || '').trim();
    const cleanDriver = String(driverName || '').trim();
    const cleanPhone = String(driverPhone || '').trim();

    if (!cleanReg || !cleanModel || !cleanDriver || !cleanPhone) {
      return failure('Registration number, vehicle model, driver name, and phone are required');
    }

    const existing = await prisma.transportVehicle.findFirst({
      where: { tenant_id: tid, registration_number: cleanReg }
    });
    if (existing) {
      return failure(`Vehicle registration "${cleanReg}" is already registered`);
    }

    const cap = parseInt(capacity, 10) || 32;
    let routeId = assignedRouteId ? toSafeInt(assignedRouteId, 0) : null;
    if (routeId) {
      const matchedRoute = await prisma.transportRoute.findFirst({ where: { id: routeId, tenant_id: tid } });
      if (!matchedRoute) {
        return failure('Selected assigned route does not exist for this institution');
      }
      routeId = matchedRoute.id;
    } else {
      routeId = null;
    }

    const created = await prisma.transportVehicle.create({
      data: {
        tenant_id: tid,
        registration_number: cleanReg,
        model: cleanModel,
        capacity: cap,
        driver_name: cleanDriver,
        driver_phone: cleanPhone,
        assigned_route_id: routeId,
        status: 'OPERATIONAL'
      }
    });

    return success(created, `Vehicle ${cleanReg} registered into transport fleet`);
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_CREATE_VEHICLE_ERROR', { error: error.message });
    return failure(String(error.message || '').toLowerCase().includes('unique') ? 'Registration number already exists' : 'Failed to add vehicle');
  }
}

async function getAssignments(tenantId = 1) {
  try {
    const tid = toSafeInt(tenantId, 1);
    await seedDemoTransportIfEmpty(tid);

    const [assignments, routes] = await Promise.all([
      prisma.transportAssignment.findMany({ where: { tenant_id: tid }, orderBy: { id: 'desc' } }),
      prisma.transportRoute.findMany({ where: { tenant_id: tid } })
    ]);

    const routeById = new Map(routes.map((r) => [toSafeInt(r.id, 0), r]));
    const formatted = assignments.map((a) => {
      const route = routeById.get(toSafeInt(a.route_id, 0));
      return {
        ...a,
        route_name: route?.name || a.route_name || 'Assigned Route',
        route_code: route?.route_code || a.route_code || `RT-${a.route_id}`,
        monthly_fare: Number(route?.monthly_fare ?? a.monthly_fare ?? 0)
      };
    });

    return success({ count: formatted.length, records: formatted });
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_GET_ASSIGNMENTS_ERROR', { error: error.message });
    return failure('Failed to retrieve student transport assignments');
  }
}

async function assignStudent(payload, tenantId = 1) {
  try {
    const tid = toSafeInt(tenantId, 1);
    await seedDemoTransportIfEmpty(tid);
    await ensureTransportTables();

    const { studentId, studentName, routeId, destinationZone, termlyFareGhs, pickupStop, dropoffStop } = payload || {};
    const cleanName = String(studentName || '').trim();
    const cleanPickup = String(pickupStop || '').trim();
    const cleanDropoff = String(dropoffStop || 'GBS Main Campus').trim();

    if ((!studentId && !cleanName) || !cleanPickup) {
      return failure('Student name/ID, commuter route, and pickup stop are required');
    }

    // Resolve commuter route strictly against database routes for this institution
    let targetRoute = null;
    if (routeId !== undefined && routeId !== null && String(routeId).trim() !== '') {
      const numericRouteId = toSafeInt(routeId, 0);
      if (numericRouteId > 0) {
        targetRoute = await prisma.transportRoute.findFirst({
          where: { id: numericRouteId, tenant_id: tid }
        });
      }
      if (!targetRoute) {
        targetRoute = await prisma.transportRoute.findFirst({
          where: { tenant_id: tid, route_code: String(routeId).trim().toUpperCase() }
        });
      }
    } else if (destinationZone) {
      const allRoutes = await prisma.transportRoute.findMany({ where: { tenant_id: tid } });
      const zoneLower = String(destinationZone).trim().toLowerCase();
      targetRoute = allRoutes.find(
        (r) => String(r.name || '').trim().toLowerCase() === zoneLower || String(r.start_location || '').trim().toLowerCase() === zoneLower
      );
      if (!targetRoute) {
        const autoCode = `RT-${String(destinationZone).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6) || 'BUS'}-${String(allRoutes.length + 1).padStart(2, '0')}`;
        targetRoute = await prisma.transportRoute.create({
          data: {
            tenant_id: tid,
            route_code: autoCode,
            name: String(destinationZone).trim(),
            start_location: cleanPickup,
            end_location: cleanDropoff || 'GBS Main Campus',
            stops: JSON.stringify([{ name: cleanPickup, time: '06:30 AM' }]),
            monthly_fare: Number(termlyFareGhs) || 450.0,
            status: 'ACTIVE'
          }
        });
      }
    }

    if (!targetRoute) {
      return failure('Selected commuter route does not exist for this institution. Please select or create a route first.');
    }

    // Resolve real student record if available
    let matchedStudent = null;
    const rawStudentIdStr = String(studentId || '').trim();
    const numericSid = rawStudentIdStr ? toSafeInt(rawStudentIdStr, 0) : 0;
    try {
      const tenantStudents = await prisma.user.findMany({
        where: { tenantId: tid, role: 'STUDENT', isDeleted: false }
      });
      matchedStudent = tenantStudents.find(
        (u) =>
          (numericSid > 0 && toSafeInt(u.id, -1) === numericSid) ||
          (rawStudentIdStr && String(u.username || '').toLowerCase() === rawStudentIdStr.toLowerCase()) ||
          (cleanName && `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase() === cleanName.toLowerCase())
      );
    } catch (_) {
      // ignore optional lookup fallback
    }

    const finalStudentId = matchedStudent ? toSafeInt(matchedStudent.id, numericSid || 1) : (numericSid || toSafeInt(cleanName, 1));
    const finalStudentName = cleanName || (matchedStudent ? `${matchedStudent.firstName || ''} ${matchedStudent.lastName || ''}`.trim() : 'Student Passenger');

    // Prevent exact duplicate active assignment on the same route for the same student
    const existingForStudent = await prisma.transportAssignment.findMany({
      where: { tenant_id: tid, student_id: finalStudentId, route_id: toSafeInt(targetRoute.id, 0) }
    });
    const activeDuplicate = existingForStudent.find(
      (a) => String(a.status || 'ACTIVE').toUpperCase() === 'ACTIVE' && String(a.student_name || '').trim().toLowerCase() === finalStudentName.toLowerCase()
    );
    if (activeDuplicate) {
      return failure(`${finalStudentName} is already assigned to route ${targetRoute.route_code} - ${targetRoute.name}`);
    }

    const created = await prisma.transportAssignment.create({
      data: {
        tenant_id: tid,
        student_id: finalStudentId,
        student_name: finalStudentName,
        route_id: toSafeInt(targetRoute.id, 1),
        pickup_stop: cleanPickup,
        dropoff_stop: cleanDropoff || targetRoute.end_location || 'GBS Main Campus',
        status: 'ACTIVE'
      }
    });

    return success(
      {
        ...created,
        route_name: targetRoute.name,
        route_code: targetRoute.route_code,
        monthly_fare: Number(targetRoute.monthly_fare || 0)
      },
      `Student ${finalStudentName} assigned to ${targetRoute.route_code} (${targetRoute.name})`
    );
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_ASSIGN_STUDENT_ERROR', { error: error.message });
    return failure('Failed to assign student to transport route');
  }
}

async function removeAssignment(assignmentId, tenantId = 1) {
  try {
    const tid = toSafeInt(tenantId, 1);
    const aid = toSafeInt(assignmentId, 0);
    if (!aid) return failure('Valid assignment ID is required');

    const existing = await prisma.transportAssignment.findFirst({ where: { id: aid, tenant_id: tid } });
    if (!existing) return failure('Student bus assignment not found');

    await prisma.transportAssignment.delete({ where: { id: aid } });
    return success({ deletedId: aid }, `Removed ${existing.student_name} from bus commuter roster`);
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_REMOVE_ASSIGNMENT_ERROR', { error: error.message });
    return failure('Failed to remove student transport assignment');
  }
}

async function getStudents(tenantId = 1) {
  try {
    const tid = toSafeInt(tenantId, 1);
    const users = await prisma.user.findMany({
      where: { tenantId: tid, role: 'STUDENT', isDeleted: false },
      orderBy: { id: 'asc' }
    });
    const records = users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || u.email,
      email: u.email,
      studentCode: u.username || `STU-${u.id}`
    }));
    return success({ count: records.length, records });
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_GET_STUDENTS_ERROR', { error: error.message });
    return failure('Failed to load enrolled students for transit assignment');
  }
}

async function getStats(tenantId = 1) {
  try {
    const tid = toSafeInt(tenantId, 1);
    await seedDemoTransportIfEmpty(tid);

    const [routes, vehicles, assignments] = await Promise.all([
      prisma.transportRoute.findMany({ where: { tenant_id: tid } }),
      prisma.transportVehicle.findMany({ where: { tenant_id: tid } }),
      prisma.transportAssignment.findMany({ where: { tenant_id: tid } })
    ]);

    const totalCapacity = vehicles.reduce((acc, v) => acc + (parseInt(v.capacity, 10) || 0), 0);
    const enrolledStudents = assignments.filter(
      (a) => String(a.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
    ).length;

    return success({
      totalRoutes: routes.length,
      totalVehicles: vehicles.length,
      totalFleetCapacity: totalCapacity,
      enrolledStudents,
      fleetUtilizationPct: totalCapacity > 0
        ? Math.min(100, Math.round((enrolledStudents / totalCapacity) * 100))
        : 0
    });
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_GET_STATS_ERROR', { error: error.message });
    return failure('Failed to retrieve transport statistics');
  }
}

async function getStatus() {
  return {
    module: 'transport',
    status: 'OPERATIONAL',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  ensureTransportTables,
  getRoutes,
  createRoute,
  deleteRoute,
  getVehicles,
  createVehicle,
  getAssignments,
  assignStudent,
  removeAssignment,
  getStudents,
  getStats,
  getStatus
};
