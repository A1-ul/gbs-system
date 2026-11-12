const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../core/database/prisma.client');
const envConfig = require('../../core/config/env.config');
const { AppError } = require('../../middleware/error.middleware');
const {
  readPersistentStore,
  writePersistentStore,
  isTenantLockedOut,
  removeDeletedTenantLockout,
  isPermanentlyDeleted,
  checkPostgresReachable
} = require('../../core/database/persistentStore');

const signToken = (id, role, tenantId) => {
  return jwt.sign({ id, role, tenantId }, envConfig.jwt.secret, {
    expiresIn: envConfig.jwt.accessExpires
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id }, envConfig.jwt.refreshSecret, {
    expiresIn: envConfig.jwt.refreshExpires
  });
};

const withDbTimeout = (promise, ms = 2200) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('DB_QUERY_TIMEOUT')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

const DEFAULT_TENANT = {
  id: 'tnt_master_default',
  name: 'GBS Educational Institution (Main Campus)',
  code: 'GBS-MAIN',
  domain: 'gbs-system.onrender.com',
  isActive: true,
  status: 'ACTIVE'
};

const initialStore = readPersistentStore();
const DYNAMIC_REGISTERED_USERS = Array.isArray(initialStore.registeredUsers) ? initialStore.registeredUsers : [];
const DYNAMIC_INSTITUTIONS = Array.isArray(initialStore.institutions) ? initialStore.institutions : [];

const deriveDeterministicTenantId = (item, fallbackIdx = 0) => {
  if (typeof item.tenantId === 'number' && !isNaN(item.tenantId) && item.tenantId > 0) return item.tenantId;
  if (typeof item.id === 'number' && !isNaN(item.id) && item.id > 0) return item.id;
  const str = String(item.tenantCode || item.id || item.institutionName || `inst_${fallbackIdx}`);
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 3) {
    return parseInt(digits.slice(-4), 10) || (1000 + fallbackIdx);
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return 1000 + (Math.abs(hash) % 8999);
};

let needsInitialInstitutionSync = false;
DYNAMIC_INSTITUTIONS.forEach((inst, idx) => {
  const detId = deriveDeterministicTenantId(inst, idx + 1);
  if (inst.tenantId !== detId) {
    inst.tenantId = detId;
    needsInitialInstitutionSync = true;
  }
});

const syncAuthStoreToDisk = () => {
  try {
    const store = readPersistentStore();
    store.registeredUsers = DYNAMIC_REGISTERED_USERS;
    store.institutions = DYNAMIC_INSTITUTIONS;
    writePersistentStore(store);
  } catch { }
};

if (needsInitialInstitutionSync) {
  syncAuthStoreToDisk();
}

const BUILTIN_SYSTEM_USERS = [
  {
    id: 'usr_developer_master',
    tenantId: 'tnt_master_default',
    email: 'gabosei48@gmail.com',
    username: 'developer',
    passwordHash: bcrypt.hashSync('0543294615Gab', 10),
    role: 'DEVELOPER',
    firstName: 'Gabriel',
    lastName: 'Osei-Appiah',
    isActive: true,
    isLocked: false,
    permissions: ['*'],
    tenant: DEFAULT_TENANT
  },
  {
    id: 'usr_admin_master',
    tenantId: 'tnt_master_default',
    email: 'admin@gbs.com',
    username: 'superadmin',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    role: 'ADMIN',
    firstName: 'GBS Super',
    lastName: 'Admin',
    isActive: true,
    isLocked: false,
    permissions: ['*'],
    tenant: DEFAULT_TENANT
  },
  {
    id: 'usr_teacher_master',
    tenantId: 'tnt_master_default',
    email: 'teacher@gbs.com',
    username: 'teacher1',
    passwordHash: bcrypt.hashSync('Teacher123!', 10),
    role: 'TEACHER',
    firstName: 'Sarah',
    lastName: 'Teacher',
    isActive: true,
    isLocked: false,
    permissions: ['*'],
    tenant: DEFAULT_TENANT
  },
  {
    id: 'usr_student_master',
    tenantId: 'tnt_master_default',
    email: 'student@gbs.com',
    username: 'student1',
    passwordHash: bcrypt.hashSync('Student123!', 10),
    role: 'STUDENT',
    firstName: 'Alex',
    lastName: 'Student',
    isActive: true,
    isLocked: false,
    permissions: ['*'],
    tenant: DEFAULT_TENANT
  },
  {
    id: 'usr_parent_master',
    tenantId: 'tnt_master_default',
    email: 'parent@gbs.com',
    username: 'parent1',
    passwordHash: bcrypt.hashSync('Parent123!', 10),
    role: 'PARENT',
    firstName: 'John',
    lastName: 'Parent',
    isActive: true,
    isLocked: false,
    permissions: ['*'],
    tenant: DEFAULT_TENANT
  },
  {
    id: 'usr_accountant_master',
    tenantId: 'tnt_master_default',
    email: 'accountant@gbs.com',
    username: 'finance1',
    passwordHash: bcrypt.hashSync('Accountant123!', 10),
    role: 'ACCOUNTANT',
    firstName: 'David',
    lastName: 'Accountant',
    isActive: true,
    isLocked: false,
    permissions: ['*'],
    tenant: DEFAULT_TENANT
  },
  {
    id: 'usr_accountant_alt',
    tenantId: 'tnt_master_default',
    email: 'finance@gbs.com',
    username: 'accountant1',
    passwordHash: bcrypt.hashSync('Accountant123!', 10),
    role: 'ACCOUNTANT',
    firstName: 'David',
    lastName: 'Accountant',
    isActive: true,
    isLocked: false,
    permissions: ['*'],
    tenant: DEFAULT_TENANT
  },
  {
    id: 'usr_staff_master',
    tenantId: 'tnt_master_default',
    email: 'staff@gbs.com',
    username: 'staff1',
    passwordHash: bcrypt.hashSync('Staff123!', 10),
    role: 'STAFF',
    firstName: 'Emma',
    lastName: 'Staff',
    isActive: true,
    isLocked: false,
    permissions: ['*'],
    tenant: DEFAULT_TENANT
  },
  {
    id: 'usr_hr_master',
    tenantId: 'tnt_master_default',
    email: 'hr@gbs.com',
    username: 'hr1',
    passwordHash: bcrypt.hashSync('Hr123!', 10),
    role: 'HR',
    firstName: 'Grace',
    lastName: 'HR Officer',
    isActive: true,
    isLocked: false,
    permissions: ['*'],
    tenant: DEFAULT_TENANT
  },
  {
    id: 'usr_alumni_master',
    tenantId: 'tnt_master_default',
    email: 'alumni@gbs.com',
    username: 'alumni1',
    passwordHash: bcrypt.hashSync('Alumni123!', 10),
    role: 'ALUMNI',
    firstName: 'Marcus',
    lastName: 'Alumni',
    isActive: true,
    isLocked: false,
    permissions: ['*'],
    tenant: DEFAULT_TENANT
  }
];

const login = async ({ email, username, identifier, password, portalRole }) => {
  const cleanId = (identifier || email || username || '').toLowerCase().trim();
  if (!cleanId || !password) {
    throw new AppError('Email/username and password are required.', 400);
  }

  // Reload latest persistent store so Developer approvals, rejections, and deletions take effect immediately
  const latestStore = readPersistentStore();
  if (Array.isArray(latestStore.registeredUsers)) {
    DYNAMIC_REGISTERED_USERS.length = 0;
    DYNAMIC_REGISTERED_USERS.push(...latestStore.registeredUsers);
  }
  if (Array.isArray(latestStore.institutions)) {
    DYNAMIC_INSTITUTIONS.length = 0;
    DYNAMIC_INSTITUTIONS.push(...latestStore.institutions);
  }

  // 0. Enforce permanent lockout for deleted institutions
  if (isTenantLockedOut({ email: cleanId, adminEmail: cleanId, code: cleanId, tenantCode: cleanId })) {
    throw new AppError(
      'Access Denied: Your institution has been deleted from the system, so you cannot access the system unless you re-register for approval.',
      403
    );
  }

  let user = null;
  let isBuiltinAccount = false;

  // 1. Check dynamic institutions FIRST so unapproved, locked, or deleted institutions can NEVER bypass via DYNAMIC_REGISTERED_USERS
  const matchedInst = DYNAMIC_INSTITUTIONS.find(
    (inst) =>
      (inst.adminEmail && inst.adminEmail.toLowerCase() === cleanId) ||
      (inst.officialEmail && inst.officialEmail.toLowerCase() === cleanId) ||
      (inst.repEmail && inst.repEmail.toLowerCase() === cleanId) ||
      (inst.tenantCode && inst.tenantCode.toLowerCase() === cleanId)
  );

  if (matchedInst) {
    const instStatus = String(matchedInst.status || '').toUpperCase();
    if (
      matchedInst.isDeleted ||
      instStatus === 'DELETED' ||
      instStatus === 'ARCHIVED_DELETED' ||
      instStatus === 'PURGED' ||
      isTenantLockedOut({
        id: matchedInst.id || matchedInst.tenantId,
        code: matchedInst.tenantCode,
        name: matchedInst.institutionName,
        email: matchedInst.adminEmail || matchedInst.officialEmail
      })
    ) {
      throw new AppError(
        'Access Denied: Your institution has been deleted from the system, so you cannot access the system unless you re-register for approval.',
        403
      );
    }
    if (instStatus === 'LOCKED' || instStatus === 'SUSPENDED' || matchedInst.isLocked === true) {
      throw new AppError(
        `Access Denied: Your institution '${matchedInst.institutionName || 'your institution'}' is currently LOCKED / SUSPENDED by the System Developer and cannot access the system.`,
        403
      );
    }
    if (instStatus === 'REJECTED') {
      throw new AppError(
        `Access Denied: Your institution application for '${matchedInst.institutionName || 'your institution'}' was rejected by the Developer Control Center. Reason: ${matchedInst.rejectionReason || 'Institutional verification requirements not met'}.`,
        403
      );
    }
    if (
      instStatus === 'PENDING_APPROVAL' ||
      instStatus === 'PENDING_DEVELOPER_APPROVAL' ||
      instStatus === 'PENDING' ||
      matchedInst.isApproved === false ||
      (!matchedInst.isApproved && instStatus !== 'ACTIVE' && instStatus !== 'APPROVED')
    ) {
      throw new AppError(
        `Access Denied: Your institution '${matchedInst.institutionName || 'your institution'}' has not yet been approved by the System Developer. Newly onboarded institutions cannot access the system until approved in the Developer Control Center.`,
        403
      );
    }
  }

  // 2. Check dynamically registered users
  const dynUser = DYNAMIC_REGISTERED_USERS.find(
    (u) => (u.email && u.email.toLowerCase() === cleanId) || (u.username && u.username.toLowerCase() === cleanId)
  );
  if (dynUser) {
    const isDynDev = String(dynUser.role || '').toUpperCase() === 'DEVELOPER' || String(dynUser.email || '').toLowerCase() === 'gabosei48@gmail.com';
    const isDynDeleted = !isDynDev && (
      dynUser.isDeleted ||
      isPermanentlyDeleted(`User:${dynUser.id}`) ||
      (String(dynUser.id || '').startsWith('usr_') && isPermanentlyDeleted(dynUser.id)) ||
      isPermanentlyDeleted(dynUser.email)
    );
    if (isDynDeleted) {
      throw new AppError('Access Denied: Your institution has been deleted from the system, so you cannot access the system unless you re-register for approval.', 403);
    }
    if (
      isTenantLockedOut({
        id: dynUser.tenantId || dynUser.tenant?.id,
        code: dynUser.tenant?.code || dynUser.tenantCode,
        name: dynUser.tenant?.name || dynUser.schoolName || dynUser.institutionName,
        email: dynUser.email
      })
    ) {
      throw new AppError('Access Denied: Your institution has been deleted from the system, so you cannot access the system unless you re-register for approval.', 403);
    }
    // Check if the user's institution is locked in DYNAMIC_INSTITUTIONS
    const userInst = matchedInst || DYNAMIC_INSTITUTIONS.find(
      (inst) =>
        (dynUser.tenantId && String(inst.tenantId || inst.id) === String(dynUser.tenantId)) ||
        (dynUser.tenantCode && inst.tenantCode && inst.tenantCode.toLowerCase() === String(dynUser.tenantCode).toLowerCase()) ||
        (dynUser.tenant?.code && inst.tenantCode && inst.tenantCode.toLowerCase() === String(dynUser.tenant.code).toLowerCase())
    );
    if (userInst) {
      const uInstStatus = String(userInst.status || '').toUpperCase();
      if (uInstStatus === 'LOCKED' || uInstStatus === 'SUSPENDED' || userInst.isLocked === true) {
        throw new AppError(
          `Access Denied: Your institution '${userInst.institutionName || 'your institution'}' is currently LOCKED / SUSPENDED by the System Developer and cannot access the system.`,
          403
        );
      }
    }
    const userStatus = String(dynUser.status || dynUser.verificationStatus || '').toUpperCase();
    if (userStatus === 'LOCKED' || userStatus === 'SUSPENDED' || dynUser.isLocked === true || dynUser.tenant?.status === 'LOCKED' || dynUser.tenant?.status === 'SUSPENDED') {
      throw new AppError(
        `Access Denied: Your institution '${dynUser.institutionName || dynUser.schoolName || dynUser.tenant?.name || 'your institution'}' is currently LOCKED / SUSPENDED by the System Developer and cannot access the system.`,
        403
      );
    }
    if (
      dynUser.isApproved === false ||
      dynUser.isActive === false ||
      userStatus === 'PENDING' ||
      userStatus === 'PENDING_APPROVAL' ||
      userStatus === 'PENDING_DEVELOPER_APPROVAL' ||
      userStatus === 'PENDING_HEADMASTER_APPROVAL' ||
      userStatus === 'REJECTED'
    ) {
      throw new AppError(
        `Access Denied: Your account (${cleanId}) has not been approved by the ${dynUser.role === 'ADMIN' ? 'System Developer' : 'Institution Headmaster'}. Unregistered or unapproved accounts cannot access the system.`,
        403
      );
    }
    user = {
      ...dynUser,
      schoolName: userInst?.institutionName || dynUser.schoolName || dynUser.institutionName || dynUser.tenantName || dynUser.tenant?.name,
      institutionName: userInst?.institutionName || dynUser.institutionName || dynUser.schoolName || dynUser.tenantName || dynUser.tenant?.name,
      tenantName: userInst?.institutionName || dynUser.tenantName || dynUser.institutionName || dynUser.schoolName || dynUser.tenant?.name,
      tenantCode: userInst?.tenantCode || dynUser.tenantCode || dynUser.tenant?.code
    };
  }

  // 3. If not in DYNAMIC_REGISTERED_USERS, construct approved Headmaster session from matchedInst
  if (!user && matchedInst) {
    user = {
      id: `usr_hm_${matchedInst.id || Date.now()}`,
      tenantId: matchedInst.tenantId || matchedInst.tenantUid || 'tnt_master_default',
      email: matchedInst.adminEmail || matchedInst.officialEmail,
      username: (matchedInst.adminEmail || matchedInst.officialEmail || 'headmaster').split('@')[0].toLowerCase(),
      password: matchedInst.adminPasswordHash,
      role: 'ADMIN',
      firstName: matchedInst.adminName || matchedInst.repFullName || 'Headmaster',
      lastName: '',
      isActive: true,
      isApproved: true,
      isLocked: false,
      permissions: ['*'],
      facePhoto: matchedInst.facePhoto || null,
      schoolName: matchedInst.institutionName,
      institutionName: matchedInst.institutionName,
      tenantName: matchedInst.institutionName,
      tenantCode: matchedInst.tenantCode,
      tenant: {
        id: matchedInst.tenantId || matchedInst.tenantUid || 'tnt_master_default',
        name: matchedInst.institutionName,
        code: matchedInst.tenantCode,
        isActive: true,
        status: 'ACTIVE'
      }
    };
  }

  // 4. Fast bounded database lookup (max 2.2s timeout)
  if (!user && (await checkPostgresReachable(250))) {
    try {
      const dbUser = await withDbTimeout(
        prisma.user.findFirst({
          where: {
            OR: [
              { email: cleanId },
              { username: cleanId }
            ]
          },
          include: { tenant: true }
        }),
        2200
      );
      if (dbUser) {
        const isDbDev = String(dbUser.role || '').toUpperCase() === 'DEVELOPER' || String(dbUser.email || '').toLowerCase() === 'gabosei48@gmail.com';
        const isDbUserDeleted = !isDbDev && (
          dbUser.isDeleted ||
          isPermanentlyDeleted(`User:${dbUser.id}`) ||
          isPermanentlyDeleted(dbUser.email)
        );
        if (isDbUserDeleted) {
          throw new AppError('Access Denied: This user account has been permanently deleted from the system.', 403);
        }
        if (
          !isDbDev &&
          (dbUser.tenant?.isDeleted ||
            isTenantLockedOut({
              id: dbUser.tenantId || dbUser.tenant?.id,
              code: dbUser.tenant?.code,
              name: dbUser.tenant?.name,
              email: dbUser.email
            }))
        ) {
          throw new AppError('Access Denied: Your institution has been deleted from the system, so you cannot access the system unless you re-register for approval.', 403);
        }
        if (!isDbDev && (dbUser.tenant?.status === 'LOCKED' || dbUser.tenant?.status === 'SUSPENDED' || dbUser.tenant?.isActive === false)) {
          throw new AppError(
            `Access Denied: Your institution '${dbUser.tenant?.name || 'your institution'}' is currently LOCKED / SUSPENDED by the System Developer and cannot access the system.`,
            403
          );
        }
        if (!isDbDev && dbUser.isActive === false) {
          throw new AppError('Access Denied: Your account is pending approval by the Headmaster or System Developer.', 403);
        }
        user = dbUser;
      }
    } catch (dbErr) {
      if (dbErr.isOperational) throw dbErr;
      console.warn('⚠️ [AUTH] Database lookup note (using built-in resilience):', dbErr.message);
    }
  }

  // 5. Fallback to built-in system accounts
  if (!user) {
    const fallback = BUILTIN_SYSTEM_USERS.find(
      (u) => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );
    if (fallback) {
      user = { ...fallback, password: fallback.passwordHash };
      isBuiltinAccount = true;
    }
  }

  // 6. Also check Prisma InstitutionRegistration if user registered in DB
  if (!user) {
    try {
      const reg = await withDbTimeout(
        prisma.institutionRegistration.findFirst({
          where: {
            OR: [
              { adminEmail: cleanId },
              { officialEmail: cleanId },
              { tenantCode: cleanId.toUpperCase() }
            ]
          }
        }),
        1800
      );
      if (reg) {
        const regStatus = String(reg.status || '').toUpperCase();
        if (
          reg.isDeleted ||
          regStatus === 'DELETED' ||
          regStatus === 'ARCHIVED_DELETED' ||
          regStatus === 'PURGED' ||
          isTenantLockedOut({ id: reg.id || reg.tenantId, code: reg.tenantCode, name: reg.institutionName, email: reg.adminEmail })
        ) {
          throw new AppError('Access Denied: Your institution has been deleted from the system, so you cannot access the system unless you re-register for approval.', 403);
        }
        if (regStatus === 'LOCKED' || regStatus === 'SUSPENDED' || reg.isLocked === true) {
          throw new AppError(
            `Access Denied: Your institution '${reg.institutionName || 'your institution'}' is currently LOCKED / SUSPENDED by the System Developer and cannot access the system.`,
            403
          );
        }
        if (regStatus === 'REJECTED') {
          throw new AppError(
            `Access Denied: Your institution application for '${reg.institutionName || 'your institution'}' was rejected by the Developer Control Center. Reason: ${reg.rejectionReason || 'Institutional verification requirements not met'}.`,
            403
          );
        }
        if (
          regStatus === 'PENDING_APPROVAL' ||
          regStatus === 'PENDING_DEVELOPER_APPROVAL' ||
          regStatus === 'PENDING' ||
          reg.isApproved === false ||
          (!reg.isApproved && regStatus !== 'ACTIVE' && regStatus !== 'APPROVED')
        ) {
          throw new AppError(
            `Access Denied: Your institution '${reg.institutionName || 'your institution'}' is pending Developer Control Center verification and approval. Newly onboarded institutions cannot access the system until approved.`,
            403
          );
        }
        if (regStatus === 'APPROVED' || regStatus === 'ACTIVE' || reg.isApproved === true) {
          user = {
            id: `usr_hm_${reg.id}`,
            tenantId: reg.tenantId || reg.tenantUid || '1',
            email: reg.adminEmail || reg.officialEmail,
            username: (reg.adminEmail || reg.officialEmail || 'headmaster').split('@')[0].toLowerCase(),
            password: reg.adminPasswordHash,
            role: 'ADMIN',
            firstName: reg.adminName || reg.repFullName || 'Headmaster',
            lastName: '',
            isActive: true,
            isApproved: true,
            isLocked: false,
            permissions: ['*'],
            facePhoto: reg.institutionLogo || null,
            tenant: {
              id: reg.tenantId || '1',
              name: reg.institutionName,
              code: reg.tenantCode,
              isActive: true,
              status: 'ACTIVE'
            }
          };
        }
      }
    } catch (regErr) {
      if (regErr.isOperational) throw regErr;
    }
  }

  if (!user) {
    throw new AppError(
      `Access Denied: Unregistered email or account ('${cleanId}'). Only accounts registered and approved by the Institution Headmaster or System Developer are permitted to access the GBS System.`,
      403
    );
  }

  let isPasswordValid = false;
  const p = String(password || '').trim();
  const hashToCompare = user.password || user.passwordHash || user.adminPasswordHash;
  if (hashToCompare) {
    try {
      if (String(hashToCompare).startsWith('$2a$') || String(hashToCompare).startsWith('$2b$')) {
        isPasswordValid = await bcrypt.compare(p, hashToCompare);
      } else {
        isPasswordValid = String(hashToCompare) === p;
      }
    } catch { }
  }

  // Developer account strict credential verification
  if (user.role === 'DEVELOPER' || (user.email && user.email.toLowerCase() === 'gabosei48@gmail.com')) {
    isPasswordValid = (p === '0543294615Gab');
  } else if (!isPasswordValid && isBuiltinAccount) {
    // Accept built-in role credentials ONLY for the built-in system accounts
    if (
      ((user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (p === 'Admin123!' || p === 'Headmaster2026!' || p === 'Headmaster123!')) ||
      (user.role === 'TEACHER' && (p === 'Teacher123!' || p === 'teacher123')) ||
      (user.role === 'STUDENT' && (p === 'Student123!' || p === 'student123')) ||
      (user.role === 'PARENT' && (p === 'Parent123!' || p === 'parent123')) ||
      (user.role === 'ACCOUNTANT' && (p === 'Accountant123!' || p === 'Finance123!' || p === 'accountant123')) ||
      (user.role === 'STAFF' && (p === 'Staff123!' || p === 'staff123')) ||
      (user.role === 'HR' && (p === 'Hr123!' || p === 'hr123')) ||
      (user.role === 'ALUMNI' && (p === 'Alumni123!' || p === 'alumni123'))
    ) {
      isPasswordValid = true;
    }
  }

  if (!isPasswordValid) {
    try {
      if (user.id && !String(user.id).startsWith('usr_')) {
        await withDbTimeout(
          prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: { increment: 1 } }
          }),
          1200
        );
      }
    } catch { }
    throw new AppError('Invalid email/username or password.', 401);
  }

  if (portalRole) {
    const pRole = portalRole.toUpperCase();
    const isMasterUser = user.role === 'DEVELOPER' ||
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      (user.email && user.email.toLowerCase() === 'gabosei48@gmail.com');
    if (!isMasterUser && user.role !== pRole) {
      throw new AppError(`Access denied. User does not have ${portalRole} authorization.`, 403);
    }
  }

  if (user.isLocked) {
    throw new AppError('Access Denied: Your user account is currently LOCKED / SUSPENDED.', 403);
  }

  // Also check if the user's tenant in Prisma is LOCKED or SUSPENDED
  if (user.role !== 'DEVELOPER') {
    if (user.tenant && (user.tenant.status === 'LOCKED' || user.tenant.status === 'SUSPENDED' || user.tenant.isActive === false)) {
      throw new AppError(`Access Denied: Your institution '${user.tenant.name || user.institutionName || 'your institution'}' is currently LOCKED / SUSPENDED by the System Developer and cannot access the system.`, 403);
    }
    try {
      const checkTid = typeof user.tenantId === 'number' ? user.tenantId : parseInt(user.tenantId, 10);
      const checkCode = user.tenantCode || user.tenant?.code;
      const dbTenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            ...(!isNaN(checkTid) ? [{ id: checkTid }] : []),
            ...(checkCode ? [{ code: checkCode }] : [])
          ]
        }
      });
      if (dbTenant) {
        if (dbTenant.isDeleted || dbTenant.status === 'ARCHIVED_DELETED' || dbTenant.status === 'PURGED') {
          throw new AppError('Access Denied: Your institution has been deleted from the system, so you cannot access the system unless you re-register for approval.', 403);
        }
        if (dbTenant.status === 'LOCKED' || dbTenant.status === 'SUSPENDED' || dbTenant.isActive === false) {
          throw new AppError(`Access Denied: Your institution '${dbTenant.name || 'your institution'}' is currently LOCKED / SUSPENDED by the System Developer and cannot access the system.`, 403);
        }
      }
    } catch (tCheckErr) {
      if (tCheckErr.isOperational) throw tCheckErr;
    }
  }

  try {
    if (user.id && !String(user.id).startsWith('usr_')) {
      await withDbTimeout(
        prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lastLoginAt: new Date()
          }
        }),
        1200
      );
    }
  } catch { }

  const isDeveloperAccount =
    String(user.role || '').toUpperCase() === 'DEVELOPER' ||
    String(user.email || '').toLowerCase() === 'gabosei48@gmail.com';
  const effectiveRole = isDeveloperAccount ? 'DEVELOPER' : user.role;

  const accessToken = signToken(user.id, effectiveRole, user.tenantId || DEFAULT_TENANT.id);
  const refreshToken = signRefreshToken(user.id);

  const exactSchoolName =
    isDeveloperAccount
      ? 'GBS SCHOOL MANAGEMENT SYSTEM'
      : (user.institutionName || user.schoolName || user.tenantName || user.tenant?.name || DEFAULT_TENANT.name);

  const { password: _, passwordHash: __, ...userWithoutPassword } = user;
  userWithoutPassword.role = effectiveRole;
  userWithoutPassword.schoolName = exactSchoolName;
  userWithoutPassword.institutionName = exactSchoolName;
  userWithoutPassword.tenantName = exactSchoolName;
  if (userWithoutPassword.tenant) {
    userWithoutPassword.tenant = {
      ...userWithoutPassword.tenant,
      name: exactSchoolName
    };
  }

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken
  };
};

/**
 * Get active institutions / schools for public tenant selector in sign-up forms
 */
const getPublicInstitutions = async () => {
  try {
    const dbTenants = await prisma.tenant.findMany({
      where: { isDeleted: false, isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        domain: true,
        status: true
      },
      orderBy: { name: 'asc' }
    });
    if (dbTenants && dbTenants.length > 0) {
      return [...dbTenants, ...DYNAMIC_INSTITUTIONS];
    }
  } catch (err) {
    console.warn('⚠️ [AUTH] Database tenant fetch notice:', err.message);
  }
  return [DEFAULT_TENANT, ...DYNAMIC_INSTITUTIONS];
};

const registerInstitution = async (data) => {
  const {
    institutionName,
    institutionType,
    country,
    region,
    city,
    physicalAddress,
    gpsLocation,
    officialEmail,
    officialPhone,
    website,
    registrationNumber,
    businessLicenseNumber,
    taxIdentificationNumber,
    institutionLogo,
    repFullName,
    repPosition,
    repEmail,
    repPhone,
    adminName,
    adminEmail,
    adminPhone,
    password,
    confirmPassword,
    termsAccepted,
    privacyAccepted,
    dataProcessingConsent
  } = data;

  const effOfficialEmail = (officialEmail || repEmail || adminEmail || data.email || data.headmasterEmail || '').toLowerCase().trim();
  const effAdminEmail = (adminEmail || officialEmail || repEmail || data.email || data.headmasterEmail || '').toLowerCase().trim();
  const effAdminName = String(adminName || repFullName || data.headmasterName || 'Head of Institution').trim();
  const effPhone = String(officialPhone || adminPhone || repPhone || data.phone || data.headmasterPhone || '').trim();
  const effFacePhoto = data.facePhoto || data.scannedFacePhoto || data.headmasterPhoto || institutionLogo || null;
  const effPassword = password || data.adminPassword;
  const effConfirmPassword = confirmPassword || effPassword;
  const effTerms = termsAccepted !== undefined ? Boolean(termsAccepted) : true;
  const effPrivacy = privacyAccepted !== undefined ? Boolean(privacyAccepted) : true;
  const effConsent = dataProcessingConsent !== undefined ? Boolean(dataProcessingConsent) : true;

  if (!institutionName || !effOfficialEmail || !effAdminEmail || !effPassword) {
    throw new AppError('Institution name, official email, admin email, and password are required.', 400);
  }

  if (effPassword !== effConfirmPassword) {
    throw new AppError('Administrator passwords do not match.', 400);
  }

  if (effPassword.length < 6) {
    throw new AppError('Administrator password must be at least 6 characters.', 400);
  }

  if (!effTerms || !effPrivacy || !effConsent) {
    throw new AppError('You must accept terms of service, privacy policy, and data processing consent to proceed.', 400);
  }

  // If a previously deleted institution re-registers for approval, clear its old deleted lockout so it enters PENDING_DEVELOPER_APPROVAL cleanly
  try {
    removeDeletedTenantLockout({
      name: institutionName.trim(),
      schoolName: institutionName.trim(),
      email: effOfficialEmail,
      adminEmail: effAdminEmail
    });
  } catch { }

  const hashedPassword = await bcrypt.hash(effPassword, 10);

  const year = new Date().getFullYear();
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const tenantUid = `TEN-${year}-${String(randSuffix).padStart(6, '0')}`;

  const nameParts = institutionName.trim().split(/\s+/);
  let acronym = nameParts.length >= 2
    ? (nameParts[0].slice(0, 1) + nameParts[1].slice(0, 2)).toUpperCase()
    : institutionName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
  if (!acronym || acronym.length < 2) acronym = 'ACC';
  const tenantCode = `GBS-${acronym}-${String(randSuffix).padStart(4, '0')}`;
  const institutionId = `INS-${year}-${String(randSuffix + 1100).padStart(6, '0')}`;
  const subscriptionId = `SUB-${year}-${String(randSuffix).padStart(6, '0')}`;

  const studentCount = parseInt(data.totalStudentsEnrolled || data.studentsCount || data.studentCount || 0, 10);
  let perStudentRate = 3; // Official Policy: Nursery – JHS = GH₵ 3 per active student per month
  const typeUpper = (institutionType || '').toUpperCase();
  if (typeUpper.includes('UNIVERSITY') || typeUpper.includes('TERTIARY')) {
    perStudentRate = 10; // Official Policy: University = GH₵ 10 per active student per month
  } else if (typeUpper.includes('SENIOR') || typeUpper.includes('SHS') || typeUpper.includes('SECONDARY')) {
    perStudentRate = 5; // Official Policy: SHS = GH₵ 5 per active student per month
  } else {
    perStudentRate = 3; // Official Policy: Nursery – JHS = GH₵ 3 per active student per month
  }

  const monthlyFee = studentCount > 0 ? (perStudentRate * studentCount) : (Number(data.monthlyFee || data.calculatedBaseFee || data.calculatedFee) || 0);
  const effPlan = data.subscriptionPlan || data.subscriptionDuration || '3_MONTHS';
  const planMonthsMap = {
    '1_MONTH': 1,
    '1_MONTH_TRIAL': 1,
    '3_MONTHS': 3,
    '6_MONTHS': 6,
    '9_MONTHS': 9,
    '12_MONTHS': 12,
    '1_YEAR': 12,
    'LIFETIME': 12
  };
  const planDiscountMap = {
    '1_MONTH': 0,
    '1_MONTH_TRIAL': 0,
    '3_MONTHS': 3,
    '6_MONTHS': 5,
    '9_MONTHS': 7,
    '12_MONTHS': 10,
    '1_YEAR': 10,
    'LIFETIME': 10
  };
  const subscribedMonths = planMonthsMap[effPlan] || 3;
  const discountPct = planDiscountMap[effPlan] || 0;
  const grossTermFee = monthlyFee * subscribedMonths;
  const discountAmount = Math.round(grossTermFee * (discountPct / 100) * 100) / 100;
  const totalTermFee = Math.round((grossTermFee - discountAmount) * 100) / 100;
  const paymentScheduleMode = data.paymentScheduleMode || 'BULK_FULL_TERM'; // 'MONTHLY_SPREAD' | 'BULK_FULL_TERM'
  const bulkTermsAccepted = Boolean(data.bulkTermsAccepted);
  const bulkTermsSignedBy = data.bulkTermsSignedBy || effAdminName;
  const amountDueNow = paymentScheduleMode === 'BULK_FULL_TERM'
    ? totalTermFee
    : Math.round((totalTermFee / subscribedMonths) * 100) / 100;
  const calculatedBaseFee = monthlyFee;

  const regData = {
    id: `reg_${Date.now()}`,
    tenantUid,
    tenantCode,
    institutionId,
    subscriptionId,
    institutionName: institutionName.trim(),
    name: institutionName.trim(),
    code: tenantCode,
    institutionType: institutionType || 'NURSERY_TO_JHS',
    totalStudentsEnrolled: studentCount,
    studentCount,
    perStudentRate,
    monthlyFee,
    subscribedMonths,
    totalTermFee,
    calculatedBaseFee,
    calculatedFee: Number(data.calculatedFee || totalTermFee || monthlyFee || 0),
    subscriptionPlan: effPlan,
    subscriptionDuration: effPlan,
    paymentScheduleMode,
    bulkTermsAccepted,
    bulkTermsSignedBy,
    paymentAmount: String(data.paymentAmount || amountDueNow),
    momoTxnId: data.momoTxnId || (effPlan === '1_MONTH_TRIAL' ? 'FREE_TRIAL_AUTO' : ''),
    hasUsedTrial: (effPlan === '1_MONTH_TRIAL'),
    isApproved: false,
    country: country || 'Ghana',
    region: region || data.stateRegion || '',
    stateRegion: region || data.stateRegion || '',
    city: city || '',
    physicalAddress: physicalAddress || data.address || '',
    address: physicalAddress || data.address || '',
    gpsLocation: gpsLocation || null,
    officialEmail: effOfficialEmail,
    email: effOfficialEmail,
    officialPhone: effPhone,
    phone: effPhone,
    website: website || null,
    registrationNumber: registrationNumber || `REG-${year}-${randSuffix}`,
    businessLicenseNumber: businessLicenseNumber || `LIC-${randSuffix}`,
    taxIdentificationNumber: taxIdentificationNumber || `TIN-${randSuffix}`,
    institutionLogo: effFacePhoto,
    facePhoto: effFacePhoto,
    headmasterPhoto: effFacePhoto,
    biometricToken: data.biometricToken || 'BIO-FACE-VERIFIED',
    voiceVerified: data.voiceVerified !== undefined ? Boolean(data.voiceVerified) : true,
    repFullName: effAdminName,
    repPosition: repPosition || 'Head of School / Director',
    repEmail: repEmail ? repEmail.toLowerCase().trim() : effOfficialEmail,
    repPhone: effPhone,
    headmasterName: effAdminName,
    adminName: effAdminName,
    adminEmail: effAdminEmail,
    adminPhone: effPhone,
    adminPasswordHash: hashedPassword,
    termsAccepted: effTerms,
    privacyAccepted: effPrivacy,
    dataProcessingConsent: effConsent,
    status: 'PENDING_DEVELOPER_APPROVAL',
    isActive: false,
    createdAt: new Date().toISOString()
  };

  // Record administrator account in pending state until Developer Control Center explicitly approves the institution
  const dynamicAdminUser = {
    id: `usr_${Date.now()}`,
    tenantId: regData.tenantUid,
    email: effAdminEmail,
    username: effAdminEmail.split('@')[0].toLowerCase(),
    password: hashedPassword,
    role: 'ADMIN',
    firstName: regData.adminName,
    lastName: '',
    isActive: false,
    isApproved: false,
    status: 'PENDING_DEVELOPER_APPROVAL',
    verificationStatus: 'PENDING_DEVELOPER_APPROVAL',
    isLocked: false,
    permissions: ['*'],
    facePhoto: data.facePhoto || data.scannedFacePhoto || data.headmasterPhoto || null,
    tenant: {
      id: regData.tenantUid,
      name: institutionName,
      code: tenantCode,
      isActive: false,
      isApproved: false,
      status: 'PENDING_DEVELOPER_APPROVAL'
    }
  };
  const existingDynUserIdx = DYNAMIC_REGISTERED_USERS.findIndex(
    (u) => u.email && u.email.toLowerCase() === effAdminEmail
  );
  if (existingDynUserIdx >= 0) {
    DYNAMIC_REGISTERED_USERS[existingDynUserIdx] = dynamicAdminUser;
  } else {
    DYNAMIC_REGISTERED_USERS.unshift(dynamicAdminUser);
  }

  try {
    if (!(await checkPostgresReachable(250))) {
      throw new Error('PG_OFFLINE_PERSISTENT_FALLBACK');
    }
    const existingReg = await withDbTimeout(
      prisma.institutionRegistration.findFirst({
        where: {
          OR: [
            { officialEmail: effOfficialEmail },
            { adminEmail: effAdminEmail },
            ...(registrationNumber ? [{ registrationNumber: registrationNumber.trim() }] : [])
          ]
        }
      }),
      2200
    );

    const prismaData = {
      tenantUid: existingReg ? existingReg.tenantUid : tenantUid,
      tenantCode: existingReg ? existingReg.tenantCode : tenantCode,
      institutionId: existingReg ? existingReg.institutionId : institutionId,
      subscriptionId: existingReg ? existingReg.subscriptionId : subscriptionId,
      institutionName: regData.institutionName,
      institutionType: regData.institutionType,
      country: regData.country || 'Ghana',
      region: regData.region || '',
      city: regData.city || '',
      physicalAddress: regData.physicalAddress || '',
      gpsLocation: regData.gpsLocation || null,
      officialEmail: regData.officialEmail,
      officialPhone: regData.officialPhone || '',
      website: regData.website || null,
      registrationNumber: existingReg ? existingReg.registrationNumber : regData.registrationNumber,
      businessLicenseNumber: regData.businessLicenseNumber,
      taxIdentificationNumber: regData.taxIdentificationNumber,
      institutionLogo: data.facePhoto || data.scannedFacePhoto || data.headmasterPhoto || regData.institutionLogo || null,
      repFullName: regData.repFullName,
      repPosition: regData.repPosition,
      repEmail: regData.repEmail,
      repPhone: String(regData.repPhone || officialPhone || adminPhone || '+233000000000'),
      adminName: regData.adminName,
      adminEmail: regData.adminEmail,
      adminPhone: regData.adminPhone || '',
      adminPasswordHash: regData.adminPasswordHash,
      termsAccepted: Boolean(regData.termsAccepted),
      privacyAccepted: Boolean(regData.privacyAccepted),
      dataProcessingConsent: Boolean(regData.dataProcessingConsent),
      totalStudentsEnrolled: regData.totalStudentsEnrolled || 0,
      perStudentRate: regData.perStudentRate || 5.0,
      calculatedBaseFee: regData.calculatedBaseFee || 0.0,
      subscriptionPlan: regData.subscriptionPlan || '1_MONTH_TRIAL',
      paymentAmount: String(regData.paymentAmount || '0'),
      momoTxnId: regData.momoTxnId || 'FREE_TRIAL_AUTO',
      hasUsedTrial: Boolean(regData.hasUsedTrial),
      isApproved: false,
      status: 'PENDING_DEVELOPER_APPROVAL'
    };

    const registration = existingReg
      ? await withDbTimeout(
        prisma.institutionRegistration.update({
          where: { id: existingReg.id },
          data: prismaData
        }),
        2200
      )
      : await withDbTimeout(
        prisma.institutionRegistration.create({
          data: prismaData
        }),
        2200
      );

    try {
      await withDbTimeout(
        prisma.auditLog.create({
          data: {
            action: 'INSTITUTION_REGISTRATION_SUBMITTED',
            module: 'TENANT_ONBOARDING',
            details: `Institution registration submitted: ${institutionName} (${registration.tenantUid}, ${registration.tenantCode}). Admin: ${adminEmail}. Status: PENDING_DEVELOPER_REVIEW.`
          }
        }),
        1200
      ).catch(() => { });
    } catch { }

    const enrichedReg = {
      ...regData,
      id: registration.id,
      tenantUid: registration.tenantUid,
      tenantCode: registration.tenantCode,
      facePhoto: data.facePhoto || data.scannedFacePhoto || data.headmasterPhoto || null,
      scannedFacePhoto: data.facePhoto || data.scannedFacePhoto || null,
      biometricFaceToken: data.biometricFaceToken || null,
      institutionalDocumentImage: data.institutionalDocumentImage || data.verificationDocument || data.campusPhoto || null,
      campusPhoto: data.campusPhoto || data.institutionalDocumentImage || null,
      verificationDocument: data.verificationDocument || data.institutionalDocumentImage || null,
      adminMobile: data.adminPhone || data.phone || data.officialPhone || null,
      gpsAddress: data.gpsAddress || data.address || data.location || null
    };
    const existingIdx = DYNAMIC_INSTITUTIONS.findIndex(
      (i) => i.adminEmail === effAdminEmail || i.tenantCode === registration.tenantCode
    );
    if (existingIdx >= 0) {
      DYNAMIC_INSTITUTIONS[existingIdx] = enrichedReg;
    } else {
      DYNAMIC_INSTITUTIONS.unshift(enrichedReg);
    }
    syncAuthStoreToDisk();

    return {
      registration: {
        id: registration.id,
        tenantUid: registration.tenantUid,
        tenantCode: registration.tenantCode,
        institutionId: registration.institutionId,
        subscriptionId: registration.subscriptionId,
        institutionName: registration.institutionName,
        status: registration.status,
        adminEmail: registration.adminEmail,
        facePhoto: enrichedReg.facePhoto,
        institutionalDocumentImage: enrichedReg.institutionalDocumentImage,
        monthlyFee: enrichedReg.monthlyFee,
        subscribedMonths: enrichedReg.subscribedMonths,
        totalTermFee: enrichedReg.totalTermFee,
        paymentScheduleMode: enrichedReg.paymentScheduleMode,
        createdAt: registration.createdAt
      },
      message: 'Institution registration received successfully. Your institution credentials and identifiers have been recorded for Developer Control Center review and provisioning.'
    };
  } catch (dbErr) {
    const enrichedReg = {
      ...regData,
      facePhoto: data.facePhoto || data.scannedFacePhoto || data.headmasterPhoto || null,
      scannedFacePhoto: data.facePhoto || data.scannedFacePhoto || null,
      biometricFaceToken: data.biometricFaceToken || null,
      institutionalDocumentImage: data.institutionalDocumentImage || data.verificationDocument || data.campusPhoto || null,
      campusPhoto: data.campusPhoto || data.institutionalDocumentImage || null,
      verificationDocument: data.verificationDocument || data.institutionalDocumentImage || null,
      adminMobile: data.adminPhone || data.phone || data.officialPhone || null,
      gpsAddress: data.gpsAddress || data.address || data.location || null
    };
    const existingIdx = DYNAMIC_INSTITUTIONS.findIndex(
      (i) => i.adminEmail === effAdminEmail || i.tenantCode === regData.tenantCode
    );
    if (existingIdx >= 0) {
      DYNAMIC_INSTITUTIONS[existingIdx] = enrichedReg;
    } else {
      DYNAMIC_INSTITUTIONS.unshift(enrichedReg);
    }
    syncAuthStoreToDisk();

    return {
      registration: {
        id: regData.id,
        tenantUid: regData.tenantUid,
        tenantCode: regData.tenantCode,
        institutionId: regData.institutionId,
        subscriptionId: regData.subscriptionId,
        institutionName: regData.institutionName,
        status: regData.status,
        adminEmail: regData.adminEmail,
        facePhoto: enrichedReg.facePhoto,
        monthlyFee: enrichedReg.monthlyFee,
        subscribedMonths: enrichedReg.subscribedMonths,
        totalTermFee: enrichedReg.totalTermFee,
        paymentScheduleMode: enrichedReg.paymentScheduleMode,
        createdAt: regData.createdAt
      },
      message: 'Institution registration received successfully. Your institution credentials and identifiers have been recorded for Developer Control Center review and provisioning.'
    };
  }
};

/**
 * Register a new user with real credentials, role-specific profile details, and record registration alert for Admin cross-check
 */
const register = async (data) => {
  const {
    firstName,
    lastName,
    email,
    username,
    password,
    role,
    tenantCode,
    tenantId,
    institutionName,
    schoolName,
    // Role-specific profile fields
    title,
    phone,
    whatsappPhone,
    nationalId,
    employeeId,
    department,
    specialization,
    highestQualification,
    experienceYears,
    dateOfBirth,
    gender,
    bloodGroup,
    medicalNotes,
    targetGrade,
    previousSchool,
    previousGpa,
    emergencyContactName,
    emergencyContactPhone,
    residentialAddress,
    city,
    country,
    relationship,
    linkedStudentId,
    qualificationNotes,
    termsAccepted
  } = data;

  let finalFirstName = (firstName || '').trim();
  let finalLastName = (lastName || '').trim();
  if (!finalFirstName && data.fullName) {
    const parts = String(data.fullName).trim().split(/\s+/);
    finalFirstName = parts[0];
    finalLastName = parts.slice(1).join(' ') || '';
  }
  if (!finalFirstName) finalFirstName = 'User';

  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const allowedRoles = ['TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'STAFF', 'ADMIN', 'HR', 'ALUMNI'];
  const userRole = (role && allowedRoles.includes(role.toUpperCase())) ? role.toUpperCase() : 'STUDENT';
  const isPreApproved = Boolean(data.approvedByHeadmaster === true || data.approvedByDeveloper === true || data.isApproved === true);
  const initialVerificationStatus = isPreApproved
    ? 'VERIFIED'
    : (userRole === 'ADMIN' ? 'PENDING_DEVELOPER_APPROVAL' : 'PENDING_HEADMASTER_APPROVAL');
  const isActive = isPreApproved;

  const hashedPassword = await bcrypt.hash(password, envConfig.jwt.saltRounds || 10);
  const userUsername = username
    ? username.toLowerCase().trim()
    : email.split('@')[0].toLowerCase() + Math.floor(Math.random() * 900 + 100);

  const requestedSchoolName = String(institutionName || schoolName || '').trim();
  const matchedDynInst = DYNAMIC_INSTITUTIONS.find(
    (inst) =>
      (tenantCode && inst.tenantCode && inst.tenantCode.toLowerCase() === String(tenantCode).trim().toLowerCase()) ||
      (tenantId && (String(inst.tenantId) === String(tenantId) || String(inst.id) === String(tenantId))) ||
      (requestedSchoolName && String(inst.institutionName || '').trim().toLowerCase() === requestedSchoolName.toLowerCase())
  );

  // Dynamic user template for immediate fallback
  const resolvedFallbackTenant = matchedDynInst
    ? {
      id: matchedDynInst.tenantId || tenantId || DEFAULT_TENANT.id,
      name: matchedDynInst.institutionName || requestedSchoolName || DEFAULT_TENANT.name,
      code: matchedDynInst.tenantCode || tenantCode || DEFAULT_TENANT.code,
      isActive: true,
      status: matchedDynInst.status || 'ACTIVE'
    }
    : {
      ...DEFAULT_TENANT,
      ...(tenantId ? { id: tenantId } : {}),
      ...(requestedSchoolName ? { name: requestedSchoolName } : {}),
      ...(tenantCode ? { code: tenantCode } : {})
    };

  const dynamicUserRecord = {
    id: `usr_${Date.now()}`,
    tenantId: resolvedFallbackTenant.id,
    tenantCode: resolvedFallbackTenant.code,
    institutionName: resolvedFallbackTenant.name,
    schoolName: resolvedFallbackTenant.name,
    firstName: finalFirstName,
    lastName: finalLastName,
    username: userUsername,
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: userRole,
    permissions: ['read', 'profile'],
    isActive,
    isApproved: isPreApproved,
    status: initialVerificationStatus,
    verificationStatus: initialVerificationStatus,
    isLocked: false,
    tenant: resolvedFallbackTenant
  };

  const dynamicProfile = {
    id: `prof_${Date.now()}`,
    userId: dynamicUserRecord.id,
    role: userRole,
    title: title || null,
    phone: phone || null,
    whatsappPhone: whatsappPhone || phone || null,
    nationalId: nationalId || null,
    employeeId: employeeId || null,
    department: department || null,
    specialization: specialization || null,
    highestQualification: highestQualification || null,
    experienceYears: experienceYears ? parseInt(experienceYears, 10) : 0,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    gender: gender || null,
    bloodGroup: bloodGroup || null,
    medicalNotes: medicalNotes || null,
    targetGrade: targetGrade || null,
    previousSchool: previousSchool || null,
    previousGpa: previousGpa || null,
    emergencyContactName: emergencyContactName || null,
    emergencyContactPhone: emergencyContactPhone || null,
    residentialAddress: residentialAddress || null,
    city: city || null,
    country: country || null,
    relationship: relationship || null,
    linkedStudentId: linkedStudentId || null,
    termsAccepted: Boolean(termsAccepted !== false),
    verificationStatus: initialVerificationStatus,
    verificationNotes: qualificationNotes || 'Registered via member sign up portal'
  };

  try {
    if (!(await checkPostgresReachable(250))) {
      throw new Error('PG_OFFLINE_PERSISTENT_FALLBACK');
    }
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });
    if (existingEmail) {
      throw new AppError('An account with this email address already exists. Please sign in.', 400);
    }

    let tenant = null;
    if (tenantCode) {
      tenant = await prisma.tenant.findFirst({
        where: { code: String(tenantCode).trim().toUpperCase(), isDeleted: false }
      });
    }
    if (!tenant && tenantId) {
      const parsedTid = parseInt(tenantId, 10);
      if (Number.isInteger(parsedTid) && parsedTid > 0) {
        tenant = await prisma.tenant.findFirst({
          where: { id: parsedTid, isDeleted: false }
        });
      }
    }
    if (!tenant && requestedSchoolName) {
      tenant = await prisma.tenant.findFirst({
        where: { name: { equals: requestedSchoolName, mode: 'insensitive' }, isDeleted: false }
      }).catch(() => null);
    }
    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: { code: 'GBS-MAIN' }
      });
    }
    if (!tenant) {
      tenant = await prisma.tenant.findFirst();
    }
    if (!tenant) {
      tenant = DEFAULT_TENANT;
    }

    // Execute atomic creation of User and UserRegistrationProfile
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: finalFirstName,
          lastName: finalLastName,
          username: userUsername,
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: userRole,
          permissions: ['read', 'profile'],
          isActive,
          isLocked: false
        }
      });

      const { id: _ignoreProfileId, ...profileDataWithoutId } = dynamicProfile;
      const regProfile = await tx.userRegistrationProfile.create({
        data: {
          ...profileDataWithoutId,
          userId: newUser.id
        }
      });

      // If PARENT and linkedStudentId is provided, attempt to establish ParentStudentLink
      if (userRole === 'PARENT' && linkedStudentId) {
        try {
          const student = await tx.user.findFirst({
            where: {
              tenantId: tenant.id,
              role: 'STUDENT',
              OR: [
                { email: linkedStudentId.toLowerCase().trim() },
                { username: linkedStudentId.toLowerCase().trim() }
              ]
            }
          });
          if (student) {
            await tx.parentStudentLink.create({
              data: {
                tenantId: tenant.id,
                parentId: newUser.id,
                studentId: student.id,
                relationship: relationship || 'PARENT',
                emergencyPhone: phone || null,
                address: residentialAddress || null
              }
            });
          }
        } catch { }
      }

      try {
        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            userId: newUser.id,
            action: 'NEW_USER_REGISTRATION',
            module: 'AUTH',
            details: `New ${userRole} account registered: ${newUser.email} (${firstName} ${lastName || ''}). Tenant: ${tenant.code}. Verification: ${initialVerificationStatus}. Details: ${qualificationNotes || employeeId || department || 'Credentials submitted'}`
          }
        });
      } catch { }

      return { user: newUser, profile: regProfile, tenant };
    });

    const accessToken = isPreApproved ? signToken(result.user.id, result.user.role, result.user.tenantId) : null;
    const refreshToken = isPreApproved ? signRefreshToken(result.user.id) : null;

    const { password: _, ...userWithoutPassword } = result.user;
    return {
      user: {
        ...userWithoutPassword,
        isApproved: isPreApproved,
        tenantName: result.tenant.name,
        tenantCode: result.tenant.code,
        verificationStatus: result.profile.verificationStatus
      },
      profile: result.profile,
      requiresApproval: !isPreApproved,
      accessToken,
      refreshToken,
      message: isPreApproved
        ? 'Account registered and activated.'
        : 'Registration submitted. Your account is pending verification and approval by the Headmaster / Developer before login is permitted.'
    };
  } catch (dbErr) {
    if (dbErr.isOperational) throw dbErr;

    // Save in dynamic registered users list (pending approval unless pre-approved)
    DYNAMIC_REGISTERED_USERS.unshift(dynamicUserRecord);
    syncAuthStoreToDisk();

    const accessToken = isPreApproved ? signToken(dynamicUserRecord.id, dynamicUserRecord.role, dynamicUserRecord.tenantId) : null;
    const refreshToken = isPreApproved ? signRefreshToken(dynamicUserRecord.id) : null;

    const { password: _, ...userWithoutPassword } = dynamicUserRecord;
    return {
      user: {
        ...userWithoutPassword,
        isApproved: isPreApproved,
        tenantName: DEFAULT_TENANT.name,
        tenantCode: DEFAULT_TENANT.code,
        verificationStatus: dynamicProfile.verificationStatus
      },
      profile: dynamicProfile,
      requiresApproval: !isPreApproved,
      accessToken,
      refreshToken,
      message: isPreApproved
        ? 'Account registered and activated.'
        : 'Registration submitted. Your account is pending verification and approval by the Headmaster / Developer before login is permitted.'
    };
  }
};

const seedDefaultAdmin = async () => {
  if (!(await checkPostgresReachable(250))) {
    return { tenant: DEFAULT_TENANT, mode: 'PERSISTENT_STORE_READY' };
  }
  try {
    let tenant = await prisma.tenant.findFirst({ where: { code: 'GBS-MAIN' } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'GBS International School (Main Branch)',
          code: 'GBS-MAIN',
          domain: 'gbs-main.school',
          status: 'ACTIVE'
        }
      });
    }

    const seedUsers = [
      { email: 'admin@gbs.com', username: 'superadmin', password: 'Admin123!', role: 'SUPER_ADMIN', firstName: 'GBS Super', lastName: 'Admin' },
      { email: 'teacher@gbs.com', username: 'teacher1', password: 'Teacher123!', role: 'TEACHER', firstName: 'Sarah', lastName: 'Teacher' },
      { email: 'student@gbs.com', username: 'student1', password: 'Student123!', role: 'STUDENT', firstName: 'Alex', lastName: 'Student' },
      { email: 'parent@gbs.com', username: 'parent1', password: 'Parent123!', role: 'PARENT', firstName: 'John', lastName: 'Parent' },
      { email: 'accountant@gbs.com', username: 'finance1', password: 'Accountant123!', role: 'ACCOUNTANT', firstName: 'David', lastName: 'Accountant' },
      { email: 'staff@gbs.com', username: 'staff1', password: 'Staff123!', role: 'STAFF', firstName: 'Emma', lastName: 'Staff' }
    ];

    for (const u of seedUsers) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await prisma.user.create({
          data: {
            tenantId: tenant.id,
            firstName: u.firstName,
            lastName: u.lastName,
            username: u.username,
            email: u.email.toLowerCase(),
            password: hashedPassword,
            role: u.role,
            permissions: ['*']
          }
        });
      } else {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await prisma.user.update({
          where: { id: existing.id },
          data: { password: hashedPassword, isLocked: false, failedLoginAttempts: 0 }
        });
      }
    }

    return { tenant };
  } catch {
    return { tenant: DEFAULT_TENANT, mode: 'PERSISTENT_STORE_READY' };
  }
};

const refreshTokenSession = async (incomingToken) => {
  if (!incomingToken) {
    throw new AppError('Refresh token is required.', 400);
  }
  let decoded;
  try {
    decoded = jwt.verify(incomingToken, envConfig.jwt.refreshSecret);
  } catch {
    throw new AppError('Invalid or expired refresh token. Please sign in again.', 401);
  }

  if (
    decoded.role !== 'DEVELOPER' &&
    (isPermanentlyDeleted(`User:${decoded.id}`) ||
      (String(decoded.id || '').startsWith('usr_') && isPermanentlyDeleted(decoded.id)))
  ) {
    throw new AppError('Access Denied: This account has been permanently deleted.', 403);
  }

  const store = readPersistentStore();
  let userRecord = null;
  const numId = parseInt(decoded.id, 10);
  if (Number.isInteger(numId) && String(numId) === String(decoded.id)) {
    try {
      userRecord = await withDbTimeout(
        prisma.user.findUnique({ where: { id: numId }, include: { tenant: true } }),
        1800
      );
    } catch { }
  }
  if (!userRecord) {
    userRecord =
      (store.registeredUsers || []).find((u) => String(u.id) === String(decoded.id)) ||
      (store.users || []).find((u) => String(u.id) === String(decoded.id)) ||
      BUILTIN_SYSTEM_USERS.find((u) => String(u.id) === String(decoded.id));
  }

  if (!userRecord) {
    throw new AppError('Access Denied: User account not found.', 403);
  }
  if (userRecord.isLocked || userRecord.isDeleted || userRecord.isActive === false) {
    throw new AppError('Access Denied: User account is locked, suspended, or deleted.', 403);
  }
  if (
    userRecord.role !== 'DEVELOPER' &&
    isTenantLockedOut({ id: userRecord.tenantId, code: userRecord.tenant?.code || userRecord.tenantCode })
  ) {
    throw new AppError('Access Denied: Your institution has been deleted from the system, so you cannot access the system unless you re-register for approval.', 403);
  }

  const accessToken = signToken(userRecord.id, userRecord.role, userRecord.tenantId || DEFAULT_TENANT.id);
  const refreshToken = signRefreshToken(userRecord.id);
  return { accessToken, refreshToken, refreshedAt: new Date().toISOString() };
};

const forgotPassword = async ({ email, phone }) => {
  const cleanEmail = email ? String(email).trim().toLowerCase() : null;
  const cleanPhone = phone ? String(phone).trim() : null;
  if (!cleanEmail && !cleanPhone) {
    throw new AppError('Please provide your registered email or phone number.', 400);
  }

  const store = readPersistentStore();
  let matched = null;
  if (cleanEmail) {
    try {
      matched = await withDbTimeout(prisma.user.findUnique({ where: { email: cleanEmail } }), 1500);
    } catch { }
    if (!matched) {
      matched =
        (store.registeredUsers || []).find((u) => String(u.email || '').toLowerCase() === cleanEmail) ||
        (store.institutions || []).find(
          (i) => String(i.adminEmail || i.officialEmail || '').toLowerCase() === cleanEmail
        );
    }
  } else if (cleanPhone) {
    matched =
      (store.registeredUsers || []).find((u) => String(u.phone || '') === cleanPhone) ||
      (store.institutions || []).find((i) => String(i.adminPhone || i.officialPhone || '') === cleanPhone);
  }

  if (!matched) {
    throw new AppError('No registered account found matching that email or phone number.', 404);
  }

  const resetCode = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const targetEmail = (matched.email || matched.adminEmail || matched.officialEmail || cleanEmail || '').toLowerCase();

  writePersistentStore((curr) => ({
    ...curr,
    passwordResets: [
      {
        email: targetEmail,
        phone: cleanPhone || matched.phone || matched.adminPhone || null,
        resetCode,
        expiresAt,
        createdAt: new Date().toISOString()
      },
      ...(curr.passwordResets || []).filter((r) => r.email !== targetEmail)
    ].slice(0, 200)
  }));

  try {
    const smsService = require('../sms/sms.service');
    await smsService.sendSMSMessage({
      recipientPhone: cleanPhone || matched.phone || matched.adminPhone || '+233000000000',
      recipientName: matched.firstName || matched.adminName || 'Account Holder',
      content: `Your GBS password recovery code is ${resetCode}. Valid for 15 minutes.`,
      tenantId: matched.tenantId || 1,
      type: 'PASSWORD_RESET_OTP'
    });
  } catch { }

  return {
    recoveryDispatched: true,
    email: targetEmail,
    expiresInMinutes: 15
  };
};

const resetPassword = async ({ email, otp, resetCode, token, newPassword, password }) => {
  const cleanEmail = email ? String(email).trim().toLowerCase() : '';
  const code = String(otp || resetCode || token || '').trim();
  const nextPw = String(newPassword || password || '').trim();

  if (!cleanEmail || !code || nextPw.length < 6) {
    throw new AppError('Registered email, valid reset code, and new password (min 6 chars) are required.', 400);
  }

  const store = readPersistentStore();
  const record = (store.passwordResets || []).find(
    (r) => String(r.email || '').toLowerCase() === cleanEmail && String(r.resetCode) === code
  );
  if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
    throw new AppError('Invalid or expired password reset code.', 400);
  }

  const hashed = await bcrypt.hash(nextPw, 10);
  try {
    const dbUser = await withDbTimeout(prisma.user.findUnique({ where: { email: cleanEmail } }), 1800);
    if (dbUser) {
      await withDbTimeout(
        prisma.user.update({ where: { id: dbUser.id }, data: { password: hashed, failedLoginAttempts: 0 } }),
        1800
      );
    }
  } catch { }

  writePersistentStore((curr) => ({
    ...curr,
    registeredUsers: (curr.registeredUsers || []).map((u) =>
      String(u.email || '').toLowerCase() === cleanEmail ? { ...u, passwordHash: hashed, password: hashed } : u
    ),
    institutions: (curr.institutions || []).map((inst) =>
      String(inst.adminEmail || inst.officialEmail || '').toLowerCase() === cleanEmail
        ? { ...inst, adminPasswordHash: hashed }
        : inst
    ),
    passwordResets: (curr.passwordResets || []).filter((r) => String(r.email || '').toLowerCase() !== cleanEmail)
  }));

  return { passwordReset: true, email: cleanEmail };
};

module.exports = {
  login,
  register,
  registerInstitution,
  getPublicInstitutions,
  seedDefaultAdmin,
  refreshTokenSession,
  forgotPassword,
  resetPassword,
  syncAuthStoreToDisk,
  getDynamicInstitutions: () => [...DYNAMIC_INSTITUTIONS],
  addDynamicInstitution: (item) => {
    const tenantId = deriveDeterministicTenantId(item, DYNAMIC_INSTITUTIONS.length + 1);
    DYNAMIC_INSTITUTIONS.unshift({ ...item, tenantId });
    syncAuthStoreToDisk();
  },
  updateDynamicInstitution: (idOrCode, updates) => {
    const target = String(idOrCode ?? '').trim().toLowerCase();
    if (!target) return null;
    const idx = DYNAMIC_INSTITUTIONS.findIndex(
      (i) =>
        String(i.id ?? '').toLowerCase() === target ||
        String(i.tenantId ?? '').toLowerCase() === target ||
        String(i.tenantCode ?? '').toLowerCase() === target ||
        String(i.tenantUid ?? '').toLowerCase() === target ||
        String(i.institutionName ?? '').toLowerCase() === target
    );
    if (idx >= 0) {
      DYNAMIC_INSTITUTIONS[idx] = { ...DYNAMIC_INSTITUTIONS[idx], ...updates, updatedAt: new Date().toISOString() };
      syncAuthStoreToDisk();
      return DYNAMIC_INSTITUTIONS[idx];
    }
    return null;
  },
  updateAllDynamicInstitutions: (updates) => {
    for (let i = 0; i < DYNAMIC_INSTITUTIONS.length; i++) {
      DYNAMIC_INSTITUTIONS[i] = { ...DYNAMIC_INSTITUTIONS[i], ...updates, updatedAt: new Date().toISOString() };
    }
    syncAuthStoreToDisk();
    return [...DYNAMIC_INSTITUTIONS];
  },
  deleteDynamicInstitution: (idOrCode) => {
    const target = String(idOrCode ?? '').trim().toLowerCase();
    if (!target) return false;
    let removed = false;
    for (let i = DYNAMIC_INSTITUTIONS.length - 1; i >= 0; i--) {
      const inst = DYNAMIC_INSTITUTIONS[i];
      if (
        String(inst.id ?? '').toLowerCase() === target ||
        String(inst.tenantId ?? '').toLowerCase() === target ||
        String(inst.tenantCode ?? '').toLowerCase() === target ||
        String(inst.tenantUid ?? '').toLowerCase() === target ||
        String(inst.institutionName ?? '').toLowerCase() === target
      ) {
        DYNAMIC_INSTITUTIONS.splice(i, 1);
        removed = true;
      }
    }
    if (removed) syncAuthStoreToDisk();
    return removed;
  },
  getDynamicUsers: () => [...DYNAMIC_REGISTERED_USERS],
  addDynamicUser: (u) => {
    DYNAMIC_REGISTERED_USERS.unshift(u);
    syncAuthStoreToDisk();
  }
};