'use strict';

const { EventEmitter } = require('events');
const prisma = require('../../core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const { AppError } = require('../../middleware/error.middleware');
const socketServer = require('../../core/socket/socketServer');

const callEventBus = new EventEmitter();
callEventBus.setMaxListeners(500);

function emitCallStreamEvent(callId, roomCode, eventType, payload = {}) {
  const envelope = {
    type: eventType,
    callId,
    roomCode,
    timestamp: new Date().toISOString(),
    ...payload
  };
  if (callId) callEventBus.emit(`call:${callId}`, envelope);
  if (roomCode && roomCode !== callId) callEventBus.emit(`call:${roomCode}`, envelope);
}

/**
 * Live In-System Voice & Video Call / Conference Service
 * Supports:
 *  - Direct 1-to-1 Voice & Video Calls:
 *      * Developer <-> Headmaster (Cross-Tenant across all registered institutions)
 *      * Headmaster <-> Parent, Headmaster <-> Teacher/Staff, Teacher <-> Parent
 *  - Multi-Participant In-System Video/Voice Conferences:
 *      * Developer <-> Headmasters Executive Conference (DEVELOPER_HEADMASTERS_CONFERENCE)
 *      * Teacher <-> Students Live Online Classrooms (CLASS_CONFERENCE)
 *      * Headmaster <-> Teachers Faculty Meetings (FACULTY_CONFERENCE)
 *      * Parent-Teacher / PTA Conferences (PARENT_CONFERENCE)
 * Strictly scoped per tenantId for all institutional roles so schools stay 100% isolated.
 */

const onlinePresenceMap = new Map(); // key -> { userId, email, name, role, tenantId, lastSeenAt }
const ONLINE_TTL_MS = 45000;

function isDeveloperUser(user = {}) {
  return String(user?.role || '').trim().toUpperCase() === 'DEVELOPER';
}

function isHeadmasterRole(role = '') {
  return ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL'].includes(String(role || '').trim().toUpperCase());
}

function parseTid(req) {
  return parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
}

function formatCallerName(user = {}) {
  if (isDeveloperUser(user)) {
    return `${user.firstName || 'Gabriel'} ${user.lastName || 'Osei-Appiah'}`.trim() + ' (System Developer)';
  }
  return (
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.name ||
    user.fullName ||
    user.email ||
    'School User'
  );
}

function touchPresence(user = {}, tid = 1) {
  if (!user) return;
  const email = String(user.email || '').trim().toLowerCase();
  const uid = String(user.id || email || '');
  const role = String(user.role || '').trim().toUpperCase();
  if (!uid && !email) return;
  const entry = {
    userId: uid,
    email,
    name: formatCallerName(user),
    role,
    tenantId: parseInt(tid, 10) || 1,
    lastSeenAt: Date.now()
  };
  if (email) onlinePresenceMap.set(`email:${email}`, entry);
  if (uid) onlinePresenceMap.set(`id:${entry.tenantId}:${uid}`, entry);
  if (isHeadmasterRole(role)) {
    onlinePresenceMap.set(`hm_tenant:${entry.tenantId}`, entry);
  }
}

function getPresenceInfo(tid, email, userId) {
  const now = Date.now();
  const eKey = email ? `email:${String(email).trim().toLowerCase()}` : null;
  const uKey = userId ? `id:${parseInt(tid, 10) || 1}:${String(userId)}` : null;
  const hmKey = `hm_tenant:${parseInt(tid, 10) || 1}`;
  const hit =
    (eKey && onlinePresenceMap.get(eKey)) ||
    (uKey && onlinePresenceMap.get(uKey)) ||
    onlinePresenceMap.get(hmKey) ||
    null;
  if (!hit) return { isOnline: false, lastSeenAt: null };
  const fresh = now - hit.lastSeenAt <= ONLINE_TTL_MS;
  return {
    isOnline: fresh,
    lastSeenAt: new Date(hit.lastSeenAt).toISOString()
  };
}

function getTenantCallStore(tid) {
  const store = readPersistentStore();
  const map = store.liveCallSessions || {};
  return Array.isArray(map[String(tid)]) ? map[String(tid)] : [];
}

function saveTenantCallStore(tid, updater) {
  const key = String(tid);
  let nextResult = [];
  writePersistentStore((curr) => {
    const map = curr.liveCallSessions || {};
    const existing = Array.isArray(map[key]) ? [...map[key]] : [];
    nextResult = updater(existing);
    return {
      ...curr,
      liveCallSessions: {
        ...map,
        [key]: nextResult.slice(0, 500)
      }
    };
  });
  return nextResult;
}

/**
 * Resolves the tenant bucket owning a call session.
 * Non-developer users are STRICTLY limited to their own tenantId (zero cross-tenant leakage).
 * Developer users can locate calls across any tenant bucket so Developer <-> Headmaster calls work for every school.
 */
function resolveCallLocation(req, callId) {
  const userTid = parseTid(req);
  const localList = getTenantCallStore(userTid);
  const localHit = localList.find(
    (c) => String(c.id) === String(callId) || String(c.roomCode) === String(callId)
  );
  if (localHit) {
    return { tid: userTid, session: localHit };
  }

  // Headmasters may also join a Developer-hosted multi-headmaster conference stored under tenant 1
  if (isHeadmasterRole(req.user?.role) && userTid !== 1) {
    const rootList = getTenantCallStore(1);
    const devConfHit = rootList.find(
      (c) =>
        (String(c.id) === String(callId) || String(c.roomCode) === String(callId)) &&
        c.callScope === 'DEVELOPER_HEADMASTERS_CONFERENCE'
    );
    if (devConfHit) {
      return { tid: 1, session: devConfHit };
    }
  }

  if (!isDeveloperUser(req.user)) {
    throw new AppError(`Live call or conference session "${callId}" was not found for this institution.`, 404);
  }

  const store = readPersistentStore();
  const map = store.liveCallSessions || {};
  for (const [bucketTid, list] of Object.entries(map)) {
    if (!Array.isArray(list)) continue;
    const hit = list.find(
      (c) => String(c.id) === String(callId) || String(c.roomCode) === String(callId)
    );
    if (hit) {
      return { tid: parseInt(bucketTid, 10) || 1, session: hit };
    }
  }

  throw new AppError(`Live call or conference session "${callId}" was not found.`, 404);
}

async function syncCallSessionToPrisma(session) {
  try {
    const online = typeof prisma.isPostgresOnline === 'function' ? await prisma.isPostgresOnline() : false;
    if (!online || !prisma.liveCallSession) return;
    await prisma.liveCallSession.upsert({
      where: { id: String(session.id) },
      update: {
        status: session.status,
        participantsJson: JSON.stringify(session.participants || []),
        answeredAt: session.answeredAt ? new Date(session.answeredAt) : null,
        endedAt: session.endedAt ? new Date(session.endedAt) : null
      },
      create: {
        id: String(session.id),
        tenantId: parseInt(session.tenantId, 10) || 1,
        roomCode: String(session.roomCode),
        callScope: String(session.callScope || 'DIRECT'),
        mediaMode: String(session.mediaMode || 'VIDEO'),
        title: String(session.title || 'Live Call'),
        initiatorUserId: String(session.initiatorUserId),
        initiatorName: String(session.initiatorName),
        initiatorRole: String(session.initiatorRole),
        targetUserId: session.targetUserId ? String(session.targetUserId) : null,
        targetName: session.targetName || null,
        targetRole: session.targetRole || null,
        status: String(session.status || 'RINGING'),
        participantsJson: JSON.stringify(session.participants || []),
        startedAt: session.startedAt ? new Date(session.startedAt) : new Date(),
        answeredAt: session.answeredAt ? new Date(session.answeredAt) : null,
        endedAt: session.endedAt ? new Date(session.endedAt) : null
      }
    }).catch(() => { });
  } catch { }
}

/**
 * Lists reachable contacts for Voice/Video Calls:
 * - For DEVELOPER: returns ALL registered institutional Headmasters across all active tenants with live online status.
 * - For Institutional Roles: returns tenant-scoped Headmasters, Teachers, Parents, Students, Staff (never exposes Developer).
 */
async function getCallDirectory(req) {
  const tid = parseTid(req);
  touchPresence(req.user, tid);
  const store = readPersistentStore();

  if (isDeveloperUser(req.user)) {
    const hmMap = new Map();
    const pushHeadmaster = (entry) => {
      const email = String(entry.email || '').trim().toLowerCase();
      const targetTid = parseInt(entry.tenantId, 10) || 1;
      const key = email || `tenant:${targetTid}`;
      if (hmMap.has(key)) return;
      const presence = getPresenceInfo(targetTid, email, entry.userId);
      hmMap.set(key, {
        userId: String(entry.userId || email || `hm_tenant_${targetTid}`),
        name: String(entry.name || 'Institution Headmaster').trim(),
        email,
        role: 'ADMIN',
        phone: entry.phone || '',
        tenantId: targetTid,
        tenantName: entry.tenantName || 'Registered Institution',
        tenantCode: entry.tenantCode || `GBS-${targetTid}`,
        isOnline: presence.isOnline,
        lastSeenAt: presence.lastSeenAt
      });
    };

    try {
      const [dbTenants, dbAdmins] = await Promise.all([
        prisma.tenant.findMany({ where: { isDeleted: false } }).catch(() => []),
        prisma.user.findMany({
          where: {
            isActive: true,
            isLocked: false,
            isDeleted: false,
            role: { in: ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL'] }
          },
          select: {
            id: true,
            tenantId: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            registrationProfile: { select: { phone: true, whatsappPhone: true } }
          }
        }).catch(() => [])
      ]);

      const tenantById = new Map(dbTenants.map((t) => [Number(t.id), t]));
      for (const adm of dbAdmins) {
        const tObj = tenantById.get(Number(adm.tenantId || 1));
        if (tObj && (tObj.status === 'DELETED' || tObj.status === 'PURGED' || tObj.isDeleted)) continue;
        pushHeadmaster({
          userId: String(adm.id),
          name: `${adm.firstName || ''} ${adm.lastName || ''}`.trim() || adm.email,
          email: adm.email,
          phone: adm.registrationProfile?.phone || adm.registrationProfile?.whatsappPhone || tObj?.headmasterPhone || '',
          tenantId: adm.tenantId || 1,
          tenantName: tObj?.name || 'GBS Main Institution',
          tenantCode: tObj?.code || 'DEFAULT'
        });
      }
      for (const t of dbTenants) {
        if (t.status === 'DELETED' || t.status === 'PURGED' || t.isDeleted) continue;
        if (t.headmasterEmail || t.headmasterName) {
          pushHeadmaster({
            userId: `hm_tenant_${t.id}`,
            name: t.headmasterName || 'Headmaster',
            email: t.headmasterEmail || '',
            phone: t.headmasterPhone || '',
            tenantId: t.id,
            tenantName: t.name,
            tenantCode: t.code
          });
        }
      }
    } catch { }

    const storeInsts = Array.isArray(store.institutions) ? store.institutions : [];
    for (const inst of storeInsts) {
      const st = String(inst.status || 'ACTIVE').toUpperCase();
      if (st === 'DELETED' || st === 'PURGED' || st === 'REJECTED') continue;
      pushHeadmaster({
        userId: inst.headmasterUserId || `hm_inst_${inst.tenantId || inst.id}`,
        name: inst.headmasterName || inst.adminName || 'Headmaster',
        email: inst.headmasterEmail || inst.adminEmail || inst.officialEmail || '',
        phone: inst.headmasterPhone || inst.adminPhone || inst.officialPhone || '',
        tenantId: parseInt(inst.tenantId || inst.assignedTenantId || inst.id, 10) || 1,
        tenantName: inst.institutionName || inst.tenantName || inst.name || 'Registered Institution',
        tenantCode: inst.tenantCode || inst.code || 'GBS-INST'
      });
    }

    const headmasters = Array.from(hmMap.values()).sort((a, b) => Number(b.isOnline) - Number(a.isOnline));
    return {
      contacts: headmasters,
      headmasters,
      teachers: [],
      parents: [],
      students: [],
      staff: []
    };
  }

  const regUsers = Array.isArray(store.registeredUsers) ? store.registeredUsers : [];

  let dbUsers = [];
  try {
    dbUsers = await prisma.user.findMany({
      where: { tenantId: tid, isActive: true, isLocked: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        registrationProfile: { select: { phone: true, whatsappPhone: true } }
      }
    }).catch(() => []);
  } catch {
    dbUsers = [];
  }

  const combined = new Map();
  const pushEntry = (u) => {
    const email = String(u.email || '').trim().toLowerCase();
    const role = String(u.role || 'MEMBER').toUpperCase();
    if (!email && !u.id) return;
    if (role === 'DEVELOPER') return; // Never expose developer account in school call directory
    const key = email || `id:${u.id}`;
    if (combined.has(key)) return;
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.fullName || u.name || email;
    const presence = getPresenceInfo(tid, email, u.id);
    combined.set(key, {
      userId: String(u.id || email),
      name: fullName,
      email,
      role,
      phone: u.phone || u.registrationProfile?.phone || u.registrationProfile?.whatsappPhone || '',
      studentName: u.studentName || u.wardName || '',
      isOnline: presence.isOnline
    });
  };

  for (const u of dbUsers) pushEntry(u);
  for (const u of regUsers) {
    if (parseInt(u.tenantId || 1, 10) !== tid) continue;
    const st = String(u.status || 'APPROVED').toUpperCase();
    if (st.includes('PENDING') || st.includes('REJECTED')) continue;
    pushEntry(u);
  }

  // Also include admitted Students & linked Parents/Guardians from store admissions
  const admissions = (store.admissions || []).filter((a) => parseInt(a.tenantId || 1, 10) === tid);
  for (const adm of admissions) {
    if (adm.firstName || adm.lastName || adm.studentName) {
      pushEntry({
        id: adm.studentUserId || `student_adm_${adm.id}`,
        firstName: adm.firstName || adm.studentName || 'Student',
        lastName: adm.lastName || '',
        email: adm.studentEmail || adm.email || `student.${adm.id}@school.local`,
        role: 'STUDENT',
        phone: adm.studentPhone || adm.phone || '',
        studentName: adm.className || adm.targetGrade || ''
      });
    }
    if (adm.guardianEmail || adm.parentEmail || adm.guardianName || adm.parentName) {
      pushEntry({
        id: `parent_${adm.id || adm.guardianEmail || adm.parentName}`,
        firstName: adm.guardianName || adm.parentName || 'Parent / Guardian',
        lastName: '',
        email: adm.guardianEmail || adm.parentEmail || '',
        role: 'PARENT',
        phone: adm.guardianPhone || adm.parentPhone || '',
        wardName: `${adm.firstName || ''} ${adm.lastName || ''}`.trim()
      });
    }
  }

  const callerEmail = String(req.user?.email || '').trim().toLowerCase();
  const callerId = String(req.user?.id || '');
  const contacts = Array.from(combined.values()).filter(
    (c) => c.userId !== callerId && (!callerEmail || c.email !== callerEmail)
  );

  return {
    contacts,
    headmasters: contacts.filter((c) => isHeadmasterRole(c.role)),
    teachers: contacts.filter((c) => c.role === 'TEACHER'),
    secretary: contacts.filter((c) => c.role === 'SECRETARY'),
    parents: contacts.filter((c) => c.role === 'PARENT'),
    students: contacts.filter((c) => c.role === 'STUDENT'),
    alumni: contacts.filter((c) => c.role === 'ALUMNI'),
    clinic: contacts.filter((c) => ['CLINIC_DOCTOR', 'CLINIC_NURSE'].includes(c.role)),
    staff: contacts.filter((c) => ['SECRETARY', 'STAFF', 'HR', 'ACCOUNTANT', 'CLINIC_DOCTOR', 'CLINIC_NURSE'].includes(c.role))
  };
}

/**
 * Initiates either a direct 1-on-1 Voice/Video Call OR a Multi-Participant Live Conference / Live Online Class Room.
 */
function formatRolePosition(role = '') {
  const r = String(role || '').trim().toUpperCase();
  const MAP = {
    DEVELOPER: 'System Engineer / Developer',
    SUPER_ADMIN: 'Executive Headmaster / Director',
    ADMIN: 'Headmaster / Principal',
    HEADMASTER: 'Headmaster / Principal',
    PRINCIPAL: 'Principal / Headmaster',
    TEACHER: 'Teacher / Lecturer',
    LECTURER: 'Lecturer / Teacher',
    SECRETARY: 'School Secretary',
    CLINIC_DOCTOR: 'School Clinic Doctor',
    CLINIC_NURSE: 'School Clinic Nurse',
    DOCTOR: 'School Clinic Doctor',
    NURSE: 'School Clinic Nurse',
    ACCOUNTANT: 'Accountant / Bursar',
    BURSAR: 'Accountant / Bursar',
    HR: 'Human Resources Officer',
    STAFF: 'Non-Teaching Staff',
    STUDENT: 'Student',
    PARENT: 'Parent / Guardian',
    ALUMNI: 'Alumni Member'
  };
  return MAP[r] || (r ? r.replace(/_/g, ' ') : 'School Member');
}

const DIRECT_RING_TIMEOUT_MS = 45000;

async function initiateCall(req) {
  const callerIsDev = isDeveloperUser(req.user);
  const body = req.body || {};
  const callScope = String(body.callScope || body.callType || 'DIRECT').toUpperCase();
  const mediaMode = String(body.mediaMode || 'VIDEO').toUpperCase() === 'VOICE' ? 'VOICE' : 'VIDEO';

  // For Developer calling a Headmaster of a specific school, store in that target institution's tenant bucket
  let targetTid = parseTid(req);
  if (callerIsDev && callScope !== 'DEVELOPER_HEADMASTERS_CONFERENCE') {
    const rawTargetTid = parseInt(body.targetTenantId, 10);
    if (!Number.isNaN(rawTargetTid) && rawTargetTid > 0) {
      targetTid = rawTargetTid;
    } else if (body.targetEmail) {
      try {
        const matched = await prisma.user.findFirst({
          where: { email: String(body.targetEmail).trim().toLowerCase() },
          select: { tenantId: true }
        }).catch(() => null);
        if (matched?.tenantId) targetTid = parseInt(matched.tenantId, 10) || 1;
      } catch { }
    }
  }

  touchPresence(req.user, callerIsDev ? 1 : targetTid);

  const initiatorUserId = String(req.user?.id || req.user?.email || 'host');
  const initiatorName = formatCallerName(req.user);
  const initiatorRole = String(req.user?.role || 'USER').toUpperCase();

  const callId = `CALL-${targetTid}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const roomCode = String(body.roomCode || `GBS-ROOM-${targetTid}-${Math.floor(100000 + Math.random() * 899999)}`).trim();

  if (callScope === 'DIRECT' && !body.targetUserId && !body.targetEmail && !body.targetRole) {
    throw new AppError('Please select a recipient (Headmaster, Parent, or Teacher) to place a direct call.', 400);
  }

  const defaultTitle =
    callScope === 'DEVELOPER_HEADMASTERS_CONFERENCE'
      ? 'Developer & Headmasters Executive Video Conference'
      : callScope === 'CLASS_CONFERENCE'
        ? `Live Online Class${body.className ? ` — ${body.className}` : ''}`
        : callScope === 'FACULTY_CONFERENCE'
          ? 'Headmaster & Teachers Faculty Conference'
          : callScope === 'STAFF_CONFERENCE'
            ? 'Headmaster & All School Staff Conference'
            : callScope === 'STUDENT_CONFERENCE'
              ? `Headmaster & Students Live Assembly${body.className ? ` — ${body.className}` : ''}`
              : callScope === 'ALL_CAMPUS_CONFERENCE'
                ? 'Headmaster All-Campus Live Video Conference (Staff, Teachers, Parents & Students)'
                : callScope === 'PARENT_CONFERENCE'
                  ? 'Parent-Teacher / Headmaster Conference'
                  : `${mediaMode === 'VOICE' ? 'Voice' : 'Video'} Call with ${body.targetName || body.targetRole || 'Participant'}`;

  const session = {
    id: callId,
    tenantId: targetTid,
    targetTenantId: targetTid,
    targetTenantName: body.targetTenantName ? String(body.targetTenantName).trim() : null,
    className: body.className ? String(body.className).trim() : null,
    subject: body.subject ? String(body.subject).trim() : null,
    roomCode,
    callScope,
    mediaMode,
    title: String(body.title || '').trim() || defaultTitle,
    initiatorUserId,
    initiatorName,
    initiatorEmail: String(req.user?.email || '').trim().toLowerCase(),
    initiatorRole,
    initiatorPosition: formatRolePosition(initiatorRole),
    targetUserId: body.targetUserId ? String(body.targetUserId) : null,
    targetName: body.targetName ? String(body.targetName).trim() : null,
    targetEmail: body.targetEmail ? String(body.targetEmail).trim().toLowerCase() : null,
    targetPhone: body.targetPhone ? String(body.targetPhone).trim() : null,
    targetRole: body.targetRole ? String(body.targetRole).toUpperCase() : (callerIsDev ? 'ADMIN' : null),
    targetPosition: formatRolePosition(body.targetRole || (callerIsDev ? 'ADMIN' : '')),
    status: callScope === 'DIRECT' ? 'RINGING' : 'ACTIVE',
    seenByCallee: false,
    missedAt: null,
    returnedAt: null,
    participants: [
      {
        userId: initiatorUserId,
        email: String(req.user?.email || '').trim().toLowerCase() || null,
        name: initiatorName,
        role: initiatorRole,
        joinedAt: new Date().toISOString(),
        audioMuted: false,
        videoOff: mediaMode === 'VOICE'
      }
    ],
    signals: [],
    chatMessages: [],
    startedAt: new Date().toISOString(),
    answeredAt: callScope === 'DIRECT' ? null : new Date().toISOString(),
    endedAt: null
  };

  saveTenantCallStore(targetTid, (list) => [session, ...list]);
  await syncCallSessionToPrisma(session);

  socketServer.emitToTenant(targetTid, 'incoming_call_invite', {
    callId: session.id,
    roomCode: session.roomCode,
    tenantId: targetTid,
    callScope: session.callScope,
    mediaMode: session.mediaMode,
    title: session.title,
    className: session.className,
    subject: session.subject,
    initiatorUserId: session.initiatorUserId,
    initiatorName: session.initiatorName,
    initiatorRole: session.initiatorRole,
    initiatorPosition: session.initiatorPosition,
    targetUserId: session.targetUserId,
    targetEmail: session.targetEmail,
    targetRole: session.targetRole,
    targetPosition: session.targetPosition,
    status: session.status,
    startedAt: session.startedAt
  });
  emitCallStreamEvent(session.id, session.roomCode, 'call_initiated', { session });

  return session;
}

function doesCallTargetUser(call, user = {}) {
  const uid = String(user.id || '');
  const uemail = String(user.email || '').trim().toLowerCase();
  const urole = String(user.role || '').toUpperCase();

  // Distinguish users cleanly by email first (prevents numeric fallback ID collisions)
  if (call.initiatorEmail && uemail) {
    if (call.initiatorEmail === uemail) return false;
  } else if (String(call.initiatorUserId) === uid) {
    return false;
  }

  if (call.targetEmail && uemail && String(call.targetEmail).toLowerCase() === uemail) {
    return true;
  }
  // When Developer calls an institution's Headmaster, any Headmaster/Super Admin of that tenant should receive it
  if (call.initiatorRole === 'DEVELOPER' && isHeadmasterRole(urole) && isHeadmasterRole(call.targetRole || 'ADMIN')) {
    return true;
  }
  if (call.targetUserId) {
    const tUid = String(call.targetUserId);
    if (uemail && tUid.toLowerCase() === uemail) return true;
    if (!call.targetEmail && tUid === uid) return true;
  }
  if (call.targetRole && !call.targetUserId && !call.targetEmail) {
    if (call.targetRole === urole) return true;
    if (isHeadmasterRole(call.targetRole) && isHeadmasterRole(urole)) return true;
  }
  if (call.callScope === 'DEVELOPER_HEADMASTERS_CONFERENCE' && (isHeadmasterRole(urole) || urole === 'DEVELOPER')) {
    return true;
  }
  if (call.callScope === 'FACULTY_CONFERENCE' && (urole === 'TEACHER' || urole === 'SECRETARY' || isHeadmasterRole(urole))) {
    return true;
  }
  if (call.callScope === 'STAFF_CONFERENCE' && ['TEACHER', 'STAFF', 'SECRETARY', 'HR', 'ACCOUNTANT', 'CLINIC_DOCTOR', 'CLINIC_NURSE'].includes(urole) || (call.callScope === 'STAFF_CONFERENCE' && isHeadmasterRole(urole))) {
    return true;
  }
  if (call.callScope === 'PARENT_CONFERENCE' && (urole === 'PARENT' || urole === 'TEACHER' || urole === 'SECRETARY' || isHeadmasterRole(urole))) {
    return true;
  }
  if (call.callScope === 'STUDENT_CONFERENCE' && (urole === 'STUDENT' || urole === 'TEACHER' || isHeadmasterRole(urole))) {
    return true;
  }
  if (call.callScope === 'ALL_CAMPUS_CONFERENCE' && urole !== 'DEVELOPER') {
    return true;
  }
  if (call.callScope === 'ALUMNI_CONFERENCE' && (urole === 'ALUMNI' || urole === 'TEACHER' || urole === 'SECRETARY' || isHeadmasterRole(urole))) {
    return true;
  }
  if (call.callScope === 'CLASS_CONFERENCE' && (urole === 'STUDENT' || urole === 'PARENT' || urole === 'TEACHER' || isHeadmasterRole(urole))) {
    return true;
  }
  return false;
}

function canUserSeeActiveConference(call, user = {}) {
  const urole = String(user.role || '').toUpperCase();
  const scope = String(call.callScope || '').toUpperCase();
  if (scope === 'DIRECT') return false;
  if (urole === 'DEVELOPER') {
    return scope === 'DEVELOPER_HEADMASTERS_CONFERENCE' || call.initiatorRole === 'DEVELOPER';
  }
  if (scope === 'ALL_CAMPUS_CONFERENCE') {
    return true;
  }
  if (urole === 'STUDENT') {
    return scope === 'CLASS_CONFERENCE' || scope === 'STUDENT_CONFERENCE';
  }
  if (urole === 'PARENT') {
    return scope === 'PARENT_CONFERENCE' || scope === 'CLASS_CONFERENCE';
  }
  if (urole === 'ALUMNI') {
    return scope === 'ALUMNI_CONFERENCE' || scope === 'ALL_CAMPUS_CONFERENCE' || scope === 'PARENT_CONFERENCE';
  }
  if (urole === 'TEACHER') {
    return ['FACULTY_CONFERENCE', 'STAFF_CONFERENCE', 'CLASS_CONFERENCE', 'STUDENT_CONFERENCE', 'PARENT_CONFERENCE', 'ALUMNI_CONFERENCE'].includes(scope);
  }
  if (['STAFF', 'SECRETARY', 'HR', 'ACCOUNTANT', 'CLINIC_DOCTOR', 'CLINIC_NURSE'].includes(urole)) {
    return ['STAFF_CONFERENCE', 'FACULTY_CONFERENCE', 'PARENT_CONFERENCE', 'ALUMNI_CONFERENCE'].includes(scope);
  }
  if (isHeadmasterRole(urole)) {
    return [
      'FACULTY_CONFERENCE',
      'STAFF_CONFERENCE',
      'CLASS_CONFERENCE',
      'STUDENT_CONFERENCE',
      'PARENT_CONFERENCE',
      'ALUMNI_CONFERENCE',
      'ALL_CAMPUS_CONFERENCE',
      'DEVELOPER_HEADMASTERS_CONFERENCE'
    ].includes(scope);
  }
  return true;
}

function expireTimedOutDirectCalls(tid) {
  const nowMs = Date.now();
  let changed = false;
  const current = getTenantCallStore(tid);
  for (const c of current) {
    if (
      c.callScope === 'DIRECT' &&
      c.status === 'RINGING' &&
      !c.answeredAt &&
      nowMs - new Date(c.startedAt || 0).getTime() >= DIRECT_RING_TIMEOUT_MS
    ) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  const nowIso = new Date(nowMs).toISOString();
  saveTenantCallStore(tid, (list) =>
    list.map((c) => {
      if (
        c.callScope === 'DIRECT' &&
        c.status === 'RINGING' &&
        !c.answeredAt &&
        nowMs - new Date(c.startedAt || 0).getTime() >= DIRECT_RING_TIMEOUT_MS
      ) {
        return {
          ...c,
          status: 'MISSED',
          missedAt: c.missedAt || nowIso,
          endedAt: c.endedAt || nowIso,
          seenByCallee: false,
          missedReason: 'NO_ANSWER_OR_OFFLINE'
        };
      }
      return c;
    })
  );
}

async function getIncomingAndActiveCalls(req) {
  const tid = parseTid(req);
  touchPresence(req.user, tid);
  expireTimedOutDirectCalls(tid);
  const callerIsDev = isDeveloperUser(req.user);
  const callerId = String(req.user?.id || '');
  const callerEmail = String(req.user?.email || '').trim().toLowerCase();
  const cutoffMs = Date.now() - 12 * 3600 * 1000;
  const missedCutoffMs = Date.now() - 7 * 24 * 3600 * 1000;

  let list = [];
  if (callerIsDev) {
    const store = readPersistentStore();
    const map = store.liveCallSessions || {};
    for (const [bTid, bucket] of Object.entries(map)) {
      expireTimedOutDirectCalls(parseInt(bTid, 10) || 1);
      if (Array.isArray(bucket)) {
        for (const c of bucket) {
          if (
            c.initiatorRole === 'DEVELOPER' ||
            c.targetRole === 'DEVELOPER' ||
            c.callScope === 'DEVELOPER_HEADMASTERS_CONFERENCE'
          ) {
            list.push(c);
          }
        }
      }
    }
    list.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime());
  } else {
    list = [...getTenantCallStore(tid)];
    // Also surface active Developer-hosted Multi-Headmaster Conferences stored in root bucket 1 to any Headmaster
    if (isHeadmasterRole(req.user?.role) && tid !== 1) {
      const rootConfs = getTenantCallStore(1).filter(
        (c) => c.callScope === 'DEVELOPER_HEADMASTERS_CONFERENCE' && ['RINGING', 'ACTIVE'].includes(c.status)
      );
      list = [...rootConfs, ...list];
    }
  }

  const recentActive = list.filter((c) => {
    if (!['RINGING', 'ACTIVE'].includes(c.status)) return false;
    const t = new Date(c.startedAt).getTime();
    return Number.isFinite(t) && t >= cutoffMs;
  });

  const incomingCalls = recentActive
    .filter((c) => c.status === 'RINGING' && doesCallTargetUser(c, req.user))
    .map((c) => ({
      ...c,
      initiatorPosition: c.initiatorPosition || formatRolePosition(c.initiatorRole)
    }));

  const missedCalls = list
    .filter((c) => {
      if (c.status !== 'MISSED' || c.callScope !== 'DIRECT') return false;
      if (c.seenByCallee === true) return false;
      const t = new Date(c.missedAt || c.endedAt || c.startedAt || 0).getTime();
      if (!Number.isFinite(t) || t < missedCutoffMs) return false;
      return doesCallTargetUser(c, req.user);
    })
    .slice(0, 15)
    .map(({ signals, ...c }) => ({
      ...c,
      initiatorPosition: c.initiatorPosition || formatRolePosition(c.initiatorRole)
    }));

  const activeConferences = recentActive.filter((c) => canUserSeeActiveConference(c, req.user));
  const myCalls = list
    .filter(
      (c) =>
        String(c.initiatorUserId) === callerId ||
        (callerEmail && c.initiatorEmail === callerEmail) ||
        doesCallTargetUser(c, req.user)
    )
    .slice(0, 25);

  return {
    incomingCalls,
    missedCalls,
    activeConferences,
    recentCalls: myCalls.map(({ signals, ...rest }) => ({
      ...rest,
      initiatorPosition: rest.initiatorPosition || formatRolePosition(rest.initiatorRole),
      targetPosition: rest.targetPosition || formatRolePosition(rest.targetRole)
    }))
  };
}

async function getMissedCalls(req) {
  const data = await getIncomingAndActiveCalls(req);
  return {
    missedCalls: data.missedCalls || [],
    unseenCount: (data.missedCalls || []).length
  };
}

async function acknowledgeMissedCall(req) {
  const callId = req.params.callId;
  const { tid } = resolveCallLocation(req, callId);
  const action = String(req.body?.action || 'DISMISSED').toUpperCase();
  const nowIso = new Date().toISOString();
  let updatedSession = null;

  saveTenantCallStore(tid, (list) =>
    list.map((c) => {
      if (String(c.id) !== String(callId) && String(c.roomCode) !== String(callId)) return c;
      updatedSession = {
        ...c,
        seenByCallee: true,
        acknowledgedAt: nowIso,
        returnedAt: action === 'RETURNED' ? nowIso : (c.returnedAt || null)
      };
      return updatedSession;
    })
  );

  if (!updatedSession) {
    throw new AppError(`Missed call "${callId}" was not found.`, 404);
  }
  return updatedSession;
}

async function answerOrJoinCall(req) {
  const callId = req.params.callId;
  const { tid } = resolveCallLocation(req, callId);
  touchPresence(req.user, tid);
  const userId = String(req.user?.id || req.user?.email || `member-${Date.now()}`);
  const userEmail = String(req.user?.email || '').trim().toLowerCase() || null;
  const userName = formatCallerName(req.user);
  const userRole = String(req.user?.role || 'MEMBER').toUpperCase();

  let updatedSession = null;
  saveTenantCallStore(tid, (list) =>
    list.map((c) => {
      if (String(c.id) !== String(callId) && String(c.roomCode) !== String(callId)) return c;
      if (c.status === 'ENDED' || c.status === 'DECLINED') {
        throw new AppError(`This call session has already ${c.status.toLowerCase()}.`, 400);
      }
      const existingParticipants = Array.isArray(c.participants) ? [...c.participants] : [];
      const alreadyIn = existingParticipants.some((p) =>
        userEmail && p.email ? p.email === userEmail : String(p.userId) === userId
      );
      if (!alreadyIn) {
        existingParticipants.push({
          userId,
          email: userEmail,
          name: userName,
          role: userRole,
          joinedAt: new Date().toISOString(),
          audioMuted: Boolean(req.body?.audioMuted),
          videoOff: c.mediaMode === 'VOICE' || Boolean(req.body?.videoOff)
        });
      }
      updatedSession = {
        ...c,
        status: 'ACTIVE',
        answeredAt: c.answeredAt || new Date().toISOString(),
        participants: existingParticipants
      };
      return updatedSession;
    })
  );

  if (!updatedSession) {
    throw new AppError(`Call session "${callId}" was not found in this institution.`, 404);
  }
  await syncCallSessionToPrisma(updatedSession);

  socketServer.emitToRoom(`call_${tid}_${updatedSession.roomCode}`, 'call_status_changed', {
    callId: updatedSession.id,
    roomCode: updatedSession.roomCode,
    status: updatedSession.status,
    participants: updatedSession.participants,
    joinedBy: { userId, name: userName, role: userRole }
  });
  emitCallStreamEvent(updatedSession.id, updatedSession.roomCode, 'participant_joined', {
    status: updatedSession.status,
    participants: updatedSession.participants,
    joinedBy: { userId, name: userName, role: userRole }
  });

  return updatedSession;
}

async function declineCall(req) {
  const callId = req.params.callId;
  const { tid } = resolveCallLocation(req, callId);
  let updatedSession = null;

  saveTenantCallStore(tid, (list) =>
    list.map((c) => {
      if (String(c.id) !== String(callId)) return c;
      updatedSession = {
        ...c,
        status: 'DECLINED',
        endedAt: new Date().toISOString(),
        declineReason: String(req.body?.reason || 'Recipient declined the call.').trim()
      };
      return updatedSession;
    })
  );

  if (!updatedSession) {
    throw new AppError(`Call session "${callId}" not found.`, 404);
  }
  await syncCallSessionToPrisma(updatedSession);
  socketServer.emitToTenant(tid, 'call_declined', {
    callId: updatedSession.id,
    roomCode: updatedSession.roomCode,
    status: 'DECLINED',
    declineReason: updatedSession.declineReason
  });
  return updatedSession;
}

async function endCall(req) {
  const callId = req.params.callId;
  const { tid } = resolveCallLocation(req, callId);
  let updatedSession = null;
  const nowIso = new Date().toISOString();

  saveTenantCallStore(tid, (list) =>
    list.map((c) => {
      if (String(c.id) !== String(callId) && String(c.roomCode) !== String(callId)) return c;
      const wasUnansweredDirect = c.callScope === 'DIRECT' && c.status === 'RINGING' && !c.answeredAt;
      updatedSession = {
        ...c,
        status: wasUnansweredDirect ? 'MISSED' : 'ENDED',
        endedAt: nowIso,
        missedAt: wasUnansweredDirect ? nowIso : (c.missedAt || null),
        seenByCallee: wasUnansweredDirect ? false : Boolean(c.seenByCallee),
        missedReason: wasUnansweredDirect ? 'UNANSWERED_OR_OFFLINE' : (c.missedReason || null)
      };
      return updatedSession;
    })
  );

  if (!updatedSession) {
    throw new AppError(`Call session "${callId}" not found.`, 404);
  }
  await syncCallSessionToPrisma(updatedSession);
  socketServer.emitToRoom(`call_${tid}_${updatedSession.roomCode}`, 'call_ended', {
    callId: updatedSession.id,
    roomCode: updatedSession.roomCode,
    status: updatedSession.status,
    endedBy: formatCallerName(req.user)
  });
  emitCallStreamEvent(updatedSession.id, updatedSession.roomCode, 'call_ended', {
    status: updatedSession.status,
    endedBy: formatCallerName(req.user)
  });
  return updatedSession;
}

async function postSignalOrChat(req) {
  const callId = req.params.callId;
  const { tid } = resolveCallLocation(req, callId);
  const senderId = String(req.user?.id || req.user?.email || 'peer');
  const senderName = formatCallerName(req.user);
  const body = req.body || {};

  let recordedItem = null;
  let targetRoomCode = null;
  let updatedCall = null;

  saveTenantCallStore(tid, (list) =>
    list.map((c) => {
      if (String(c.id) !== String(callId) && String(c.roomCode) !== String(callId)) return c;
      targetRoomCode = c.roomCode;
      if (body.chatText) {
        const chatMsg = {
          id: `MSG-${Date.now()}-${Math.floor(10 + Math.random() * 90)}`,
          senderId,
          senderName,
          senderRole: String(req.user?.role || 'USER').toUpperCase(),
          text: String(body.chatText).trim(),
          sentAt: new Date().toISOString()
        };
        recordedItem = chatMsg;
        updatedCall = {
          ...c,
          chatMessages: [...(c.chatMessages || []), chatMsg].slice(-100)
        };
        return updatedCall;
      }

      if (!body.signalType && !body.mediaMode) {
        throw new AppError('signalType (OFFER, ANSWER, ICE_CANDIDATE, or MEDIA_MODE) or chatText is required.', 400);
      }

      const normalizedSignalType = String(body.signalType || 'MEDIA_MODE').toUpperCase();
      let nextMediaMode = c.mediaMode;
      let nextParticipants = c.participants || [];
      if (normalizedSignalType === 'MEDIA_MODE' || body.mediaMode) {
        const requestedMode = String(body.mediaMode || body.payload?.mediaMode || '').toUpperCase();
        if (requestedMode === 'VOICE' || requestedMode === 'VIDEO') {
          nextMediaMode = requestedMode;
          const callerEmailLower = String(req.user?.email || '').trim().toLowerCase();
          nextParticipants = (c.participants || []).map((p) => {
            const matchesParticipant =
              String(p.userId) === senderId ||
              (callerEmailLower && String(p.email || '').trim().toLowerCase() === callerEmailLower);
            if (!matchesParticipant) return p;
            return {
              ...p,
              videoOff: requestedMode === 'VOICE' ? true : Boolean(body.payload?.videoOff === true)
            };
          });
        }
      }

      const sig = {
        id: `SIG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        senderId,
        senderEmail: String(req.user?.email || '').trim().toLowerCase() || null,
        senderName,
        targetUserId: body.targetUserId ? String(body.targetUserId) : null,
        signalType: normalizedSignalType,
        payload:
          normalizedSignalType === 'MEDIA_MODE'
            ? { ...(body.payload || {}), mediaMode: nextMediaMode }
            : (body.payload || null),
        createdAt: new Date().toISOString()
      };
      recordedItem = sig;
      updatedCall = {
        ...c,
        mediaMode: nextMediaMode,
        participants: nextParticipants,
        signals: [...(c.signals || []), sig].slice(-120)
      };
      return updatedCall;
    })
  );

  if (!updatedCall) {
    throw new AppError(`Call session "${callId}" not found.`, 404);
  }

  socketServer.emitToRoom(`call_${tid}_${targetRoomCode}`, 'webrtc_signal', {
    callId: updatedCall.id,
    roomCode: targetRoomCode,
    mediaMode: updatedCall.mediaMode,
    ...recordedItem
  });
  emitCallStreamEvent(
    updatedCall.id,
    targetRoomCode,
    body.chatText ? 'chat_message' : 'webrtc_signal',
    {
      item: recordedItem,
      mediaMode: updatedCall.mediaMode,
      participants: updatedCall.participants
    }
  );
  if (recordedItem?.signalType === 'MEDIA_MODE') {
    emitCallStreamEvent(updatedCall.id, targetRoomCode, 'media_mode_changed', {
      mediaMode: updatedCall.mediaMode,
      participants: updatedCall.participants,
      changedBy: senderName
    });
  }

  return {
    callId: updatedCall.id,
    roomCode: targetRoomCode,
    mediaMode: updatedCall.mediaMode,
    recorded: recordedItem,
    participants: updatedCall.participants
  };
}

async function getCallState(req) {
  const { session: call } = resolveCallLocation(req, req.params.callId);
  const sinceIso = req.query?.since ? String(req.query.since) : null;
  const callerId = String(req.user?.id || req.user?.email || '');
  const callerEmail = String(req.user?.email || '').trim().toLowerCase() || null;
  const signals = (call.signals || []).filter((s) => {
    if (s.senderEmail && callerEmail) {
      if (s.senderEmail === callerEmail) return false;
    } else if (String(s.senderId) === callerId) {
      return false;
    }
    if (s.targetUserId && callerId && String(s.targetUserId) !== callerId) return false;
    if (sinceIso && s.createdAt <= sinceIso) return false;
    return true;
  });

  return {
    session: {
      id: call.id,
      tenantId: call.tenantId,
      targetTenantId: call.targetTenantId || call.tenantId,
      targetTenantName: call.targetTenantName || null,
      className: call.className || null,
      subject: call.subject || null,
      roomCode: call.roomCode,
      callScope: call.callScope,
      mediaMode: call.mediaMode,
      title: call.title,
      initiatorUserId: call.initiatorUserId,
      initiatorName: call.initiatorName,
      initiatorRole: call.initiatorRole,
      targetUserId: call.targetUserId,
      targetName: call.targetName,
      targetEmail: call.targetEmail || null,
      targetPhone: call.targetPhone || null,
      targetRole: call.targetRole,
      status: call.status,
      participants: call.participants || [],
      chatMessages: call.chatMessages || [],
      startedAt: call.startedAt,
      answeredAt: call.answeredAt,
      endedAt: call.endedAt
    },
    signals
  };
}

async function updatePresence(req) {
  const tid = parseTid(req);
  touchPresence(req.user, tid);
  return {
    online: true,
    tenantId: tid,
    role: String(req.user?.role || '').toUpperCase(),
    email: req.user?.email || null,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getCallDirectory,
  initiateCall,
  getIncomingAndActiveCalls,
  getMissedCalls,
  acknowledgeMissedCall,
  answerOrJoinCall,
  declineCall,
  endCall,
  postSignalOrChat,
  getCallState,
  updatePresence,
  resolveCallLocation,
  callEventBus
};
