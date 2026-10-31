const bcrypt = require('bcryptjs');
const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');

/**
 * Retrieve all tenants with their subscription and user counts
 */
const getAllTenants = async () => {
  return await prisma.tenant.findMany({
    where: { isDeleted: false },
    include: {
      subscriptions: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: { licenses: true }
      },
      _count: {
        select: { users: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Retrieve specific tenant by ID with active subscriptions and licenses
 */
const getTenantById = async (id) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      subscriptions: {
        include: { licenses: true },
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: { users: true }
      }
    }
  });

  if (!tenant || tenant.isDeleted) {
    throw new AppError('Tenant not found.', 404);
  }
  return tenant;
};

/**
 * Automated Enterprise Tenant Provisioning Engine
 * Creates:
 * 1. Unique Tenant with System Identifiers (TEN-2026-XXXXXX, GBS-ACC-XXXX)
 * 2. 30-Day Trial Subscription (SUB-2026-XXXXXX)
 * 3. Default Enterprise License
 * 4. Tenant Administrator Account
 * 5. Permanent Audit Log Entry
 */
const createTenant = async (data, operatorUser) => {
  const year = new Date().getFullYear();
  const count = await prisma.tenant.count();
  const sequenceNum = count + 1;

  // Identification System
  const tenantCode = data.code 
    ? (data.code.startsWith('GBS-') ? data.code.toUpperCase() : `GBS-${data.code.toUpperCase()}`)
    : `GBS-ACC-${String(sequenceNum).padStart(4, '0')}`;

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day trial

  // Execute ACID Transaction for Provisioning
  const provisionedTenant = await prisma.$transaction(async (tx) => {
    // 1. Create Tenant
    const tenant = await tx.tenant.create({
      data: {
        name: data.name,
        code: tenantCode,
        domain: data.domain || `${tenantCode.toLowerCase().replace(/[^a-z0-9]/g, '')}.gbs.edu`,
        status: 'ACTIVE',
        isActive: true,
        createdBy: operatorUser ? operatorUser.id : null
      }
    });

    // 2. Create Default Subscription (Enterprise Trial)
    const subscription = await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        planName: data.planName || 'Enterprise SaaS Tier (30-Day Trial)',
        startDate,
        endDate,
        gracePeriodDays: 7,
        autoLock: true,
        status: 'ACTIVE',
        currency: 'USD',
        amountPaid: 0.0
      }
    });

    // 3. Create Default License Key
    const licenseKey = `GBS-LIC-${year}-${Buffer.from(`${tenant.id}_${Date.now()}`).toString('hex').slice(0, 12).toUpperCase()}`;
    await tx.license.create({
      data: {
        subscriptionId: subscription.id,
        licenseKey: licenseKey,
        expiresAt: endDate,
        isActive: true,
        maxUsers: data.maxUsers || 100,
        maxStudents: data.maxStudents || 1000
      }
    });

    // 4. Create Initial Administrator Account if provided
    let adminUser = null;
    if (data.adminEmail) {
      const hashedPassword = await bcrypt.hash(data.adminPassword || 'Admin123!', 10);
      adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: data.adminFirstName || 'Institution',
          lastName: data.adminLastName || 'Admin',
          username: data.adminEmail.split('@')[0],
          email: data.adminEmail.toLowerCase(),
          password: hashedPassword,
          role: 'ADMIN',
          permissions: ['all_admin_permissions', 'manage_academics', 'manage_admissions', 'verify_users']
        },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true
        }
      });
    }

    // 5. Create Audit Log Entry
    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: operatorUser ? operatorUser.id : (adminUser ? adminUser.id : null),
        action: 'TENANT_PROVISIONED',
        module: 'TENANT_MANAGEMENT',
        details: `Enterprise Tenant '${tenant.name}' (${tenant.code}) provisioned successfully with 30-day trial subscription ending ${endDate.toISOString().split('T')[0]}.`
      }
    });

    return {
      tenant,
      subscription,
      adminUser
    };
  });

  return provisionedTenant;
};

/**
 * Update Tenant Status (ACTIVE, GRACE_PERIOD, EXPIRED, SUSPENDED, LOCKED)
 */
const updateTenantStatus = async (id, status, operatorUser, reason) => {
  const tenantId = parseInt(id, 10);
  const targetTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!targetTenant) {
    throw new AppError('Tenant not found.', 404);
  }

  const updatedTenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status,
      isActive: status === 'ACTIVE' || status === 'GRACE_PERIOD'
    }
  });

  // Create Audit Log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: operatorUser ? operatorUser.id : null,
      action: `TENANT_STATUS_${status}`,
      module: 'TENANT_MANAGEMENT',
      details: `Operator changed tenant '${targetTenant.name}' status from ${targetTenant.status} to ${status}. Reason: ${reason || 'Operator lifecycle management'}`
    }
  });

  return updatedTenant;
};

module.exports = {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenantStatus
};