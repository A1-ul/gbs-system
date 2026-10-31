'use strict';

const prisma = require('../../core/database/prisma.client');
const logger = require('../../utils/logger') || console;

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

async function getRoutes(tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const routes = await prisma.$queryRawUnsafe(`
      SELECT r.*, 
        (SELECT COUNT(*)::int FROM transport_vehicles v WHERE v.assigned_route_id = r.id) as vehicles_count,
        (SELECT COUNT(*)::int FROM transport_assignments a WHERE a.route_id = r.id AND a.status = 'ACTIVE') as enrolled_students
      FROM transport_routes r
      WHERE r.tenant_id = $1
      ORDER BY r.id ASC;
    `, tid);

    // Parse JSON stops
    const formatted = routes.map(r => ({
      ...r,
      stops: typeof r.stops === 'string' ? JSON.parse(r.stops || '[]') : (r.stops || [])
    }));

    return success({ count: formatted.length, records: formatted });
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_GET_ROUTES_ERROR', { error: error.message });
    return failure('Failed to retrieve transport routes');
  }
}

async function createRoute(payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { routeCode, name, startLocation, endLocation, stops, monthlyFare } = payload;

    if (!routeCode || !name || !startLocation || !endLocation) {
      return failure('Route code, name, start location, and end location are required');
    }

    const stopsJson = typeof stops === 'string' ? stops : JSON.stringify(stops || []);
    const fare = parseFloat(monthlyFare) || 150.00;

    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO transport_routes (tenant_id, route_code, name, start_location, end_location, stops, monthly_fare, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
      RETURNING *;
    `, tid, routeCode, name, startLocation, endLocation, stopsJson, fare);

    return success(result[0], 'Transport route created successfully');
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_CREATE_ROUTE_ERROR', { error: error.message });
    return failure(error.message.includes('unique') ? 'Route code already exists' : 'Failed to create route');
  }
}

async function getVehicles(tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const vehicles = await prisma.$queryRawUnsafe(`
      SELECT v.*, r.name as route_name, r.route_code
      FROM transport_vehicles v
      LEFT JOIN transport_routes r ON v.assigned_route_id = r.id
      WHERE v.tenant_id = $1
      ORDER BY v.id ASC;
    `, tid);

    return success({ count: vehicles.length, records: vehicles });
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_GET_VEHICLES_ERROR', { error: error.message });
    return failure('Failed to retrieve transport fleet vehicles');
  }
}

async function createVehicle(payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { registrationNumber, model, capacity, driverName, driverPhone, assignedRouteId } = payload;

    if (!registrationNumber || !model || !driverName || !driverPhone) {
      return failure('Registration number, vehicle model, driver name, and phone are required');
    }

    const cap = parseInt(capacity, 10) || 32;
    const routeId = assignedRouteId ? parseInt(assignedRouteId, 10) : null;

    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO transport_vehicles (tenant_id, registration_number, model, capacity, driver_name, driver_phone, assigned_route_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPERATIONAL')
      RETURNING *;
    `, tid, registrationNumber, model, cap, driverName, driverPhone, routeId);

    return success(result[0], 'Vehicle registered into transport fleet');
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_CREATE_VEHICLE_ERROR', { error: error.message });
    return failure(error.message.includes('unique') ? 'Registration number already exists' : 'Failed to add vehicle');
  }
}

async function getAssignments(tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const assignments = await prisma.$queryRawUnsafe(`
      SELECT a.*, r.name as route_name, r.route_code, r.monthly_fare
      FROM transport_assignments a
      JOIN transport_routes r ON a.route_id = r.id
      WHERE a.tenant_id = $1
      ORDER BY a.id DESC;
    `, tid);

    return success({ count: assignments.length, records: assignments });
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_GET_ASSIGNMENTS_ERROR', { error: error.message });
    return failure('Failed to retrieve student transport assignments');
  }
}

async function assignStudent(payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { studentId, studentName, routeId, pickupStop, dropoffStop } = payload;

    if (!studentId || !routeId || !pickupStop || !dropoffStop) {
      return failure('Student, route, pickup stop, and dropoff stop are required');
    }

    const sid = parseInt(studentId, 10);
    const rid = parseInt(routeId, 10);

    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO transport_assignments (tenant_id, student_id, student_name, route_id, pickup_stop, dropoff_stop, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
      RETURNING *;
    `, tid, sid, studentName || 'Student Passenger', rid, pickupStop, dropoffStop);

    return success(result[0], 'Student assigned to bus route successfully');
  } catch (error) {
    if (logger.error) logger.error('TRANSPORT_ASSIGN_STUDENT_ERROR', { error: error.message });
    return failure('Failed to assign student to transport route');
  }
}

async function getStats(tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const routeCount = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM transport_routes WHERE tenant_id = $1', tid);
    const vehicleCount = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count, COALESCE(SUM(capacity), 0)::int as capacity FROM transport_vehicles WHERE tenant_id = $1', tid);
    const studentCount = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM transport_assignments WHERE tenant_id = $1 AND status = \'ACTIVE\'', tid);

    return success({
      totalRoutes: routeCount[0]?.count || 0,
      totalVehicles: vehicleCount[0]?.count || 0,
      totalFleetCapacity: vehicleCount[0]?.capacity || 0,
      enrolledStudents: studentCount[0]?.count || 0,
      fleetUtilizationPct: vehicleCount[0]?.capacity > 0 
        ? Math.round(((studentCount[0]?.count || 0) / vehicleCount[0]?.capacity) * 100) 
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
  getRoutes,
  createRoute,
  getVehicles,
  createVehicle,
  getAssignments,
  assignStudent,
  getStats,
  getStatus
};
