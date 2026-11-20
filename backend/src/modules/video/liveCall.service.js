'use strict';

const prisma = require('../../core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const { AppError } = require('../../middleware/error.middleware');
const socketServer = require('../../core/socket/socketServer');

/**
 * Live In-System Voice & Video Call / Conference Service
 * Supports:
 *  - Direct 1-to-1 Voice & Video Calls: Headmaster <-> Parent, Headmaster <-> Teacher/Staff, Teacher <-> Parent
 *  - Multi-Participant In-System Video/Voice Conferences: Headmaster-Teachers Meetings, Teacher-Class/PTA Conferences
 * Strictly scoped per tenantId so millions of schools run isolated without cross-tenant leaks.
 */

function parseTid(req) {
  return parseInt(req.tenantId || req.user?.tenantId || 1, 10) || 1;
}

function formatCallerName(user = {}) {
  return (
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.name ||
    user.fullName ||
    user.email ||
    'School User'
  );
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
    }).catch(() => {});
  } catch { }
}

/**
 * Lists tenant-scoped reachable contacts (Teachers, Parents/Guardians, Headmasters, Staff)
 * for direct Headmaster <-> Parent, Headmaster <-> Teacher, or Teacher <-> Parent calls.
 */
async function getCallDirectory(req) {
  const tid = parseTid(req);
  const store = readPersistentStore();
  const regUsers = Array.isArray(store.registeredUsers) ? store.registeredUsers : [];

  let dbUsers = [];
  try {
    dbUsers = await prisma.user.findMany({
      where: { tenantId: tid, isActive: true, isLocked: false },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true }
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
    combined.set(key, {
      userId: String(u.id || email),
      name: fullName,
      email,
      role,
      phone: u.phone || '',
      studentName: u.studentName || u.wardName || ''
    });
  };

  for (const u of dbUsers) pushEntry(u);
  for (const u of regUsers) {
    if (parseInt(u.tenantId || 1, 10) !== tid) continue;
    const st = String(u.status || 'APPROVED').toUpperCase();
    if (st.includes('PENDING') || st.includes('REJECTED')) continue;
    pushEntry(u);
  }

  // Also include linked Parents/Guardians from admitted parents & parent-student store links
  const admissions = (store.admissions || []).filter((a) => parseInt(a.tenantId || 1, 10) === tid);
  for (const adm of admissions) {
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
    headmasters: contacts.filter((c) => ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL'].includes(c.role)),
    teachers: contacts.filter((c) => c.role === 'TEACHER'),
    parents: contacts.filter((c) => c.role === 'PARENT'),
    staff: contacts.filter((c) => ['STAFF', 'HR', 'ACCOUNTANT', 'CLINIC_DOCTOR', 'CLINIC_NURSE'].includes(c.role))
  };
}

/**
 * Initiates either a direct 1-on-1 Voice/Video Call OR a Multi-Participant Live Conference Room.
 */
async function initiateCall(req) {
  const tid = parseTid(req);
  const body = req.body || {};
  const callScope = String(body.callScope || 'DIRECT').toUpperCase();
  const mediaMode = String(body.mediaMode || 'VIDEO').toUpperCase() === 'VOICE' ? 'VOICE' : 'VIDEO';
  const initiatorUserId = String(req.user?.id || req.user?.email || 'host');
  const initiatorName = formatCallerName(req.user);
  const initiatorRole = String(req.user?.role || 'USER').toUpperCase();

  const callId = `CALL-${tid}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const roomCode = String(body.roomCode || `GBS-ROOM-${tid}-${Math.floor(100000 + Math.random() * 899999)}`).trim();

  if (callScope === 'DIRECT' && !body.targetUserId && !body.targetEmail && !body.targetRole) {
    throw new AppError('Please select a recipient (Parent, Teacher, or Headmaster) to place a direct call.', 400);
  }

  const session = {
    id: callId,
    tenantId: tid,
    roomCode,
    callScope,
    mediaMode,
    title:
      String(body.title || '').trim() ||
      (callScope === 'FACULTY_CONFERENCE'
        ? 'Headmaster & Teachers Faculty Conference'
        : callScope === 'PARENT_CONFERENCE'
          ? 'Parent-Teacher / Headmaster Conference'
          : `${mediaMode === 'VOICE' ? 'Voice' : 'Video'} Call with ${body.targetName || body.targetRole || 'Participant'}`),
    initiatorUserId,
    initiatorName,
    initiatorEmail: String(req.user?.email || '').trim().toLowerCase(),
    initiatorRole,
    targetUserId: body.targetUserId ? String(body.targetUserId) : null,
    targetName: body.targetName ? String(body.targetName).trim() : null,
    targetEmail: body.targetEmail ? String(body.targetEmail).trim().toLowerCase() : null,
    targetRole: body.targetRole ? String(body.targetRole).toUpperCase() : null,
    status: callScope === 'DIRECT' ? 'RINGING' : 'ACTIVE',
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

  saveTenantCallStore(tid, (list) => [session, ...list]);
  await syncCallSessionToPrisma(session);

  socketServer.emitToTenant(tid, 'incoming_call_invite', {
    callId: session.id,
    roomCode: session.roomCode,
    tenantId: tid,
    callScope: session.callScope,
    mediaMode: session.mediaMode,
    title: session.title,
    initiatorUserId: session.initiatorUserId,
    initiatorName: session.initiatorName,
    initiatorRole: session.initiatorRole,
    targetUserId: session.targetUserId,
    targetEmail: session.targetEmail,
    targetRole: session.targetRole,
    status: session.status,
    startedAt: session.startedAt
  });

  return session;
}

function getCallByIdOrFail(tid, callId) {
  const list = getTenantCallStore(tid);
  const session = list.find((c) => String(c.id) === String(callId) || String(c.roomCode) === String(callId));
  if (!session) {
    throw new AppError(`Live call or conference session "${callId}" was not found for this institution.`, 404);
  }
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
  if (call.targetUserId) {
    const tUid = String(call.targetUserId);
    if (uemail && tUid.toLowerCase() === uemail) return true;
    if (!call.targetEmail && tUid === uid) return true;
  }
  if (call.targetRole && !call.targetUserId && !call.targetEmail && call.targetRole === urole) {
    return true;
  }
  if (call.callScope === 'FACULTY_CONFERENCE' && ['TEACHER', 'ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL'].includes(urole)) {
    return true;
  }
  if (call.callScope === 'PARENT_CONFERENCE' && ['PARENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN', 'HEADMASTER'].includes(urole)) {
    return true;
  }
  if (call.callScope === 'CLASS_CONFERENCE' && ['STUDENT', 'PARENT', 'TEACHER', 'ADMIN'].includes(urole)) {
    return true;
  }
  return false;
}

async function getIncomingAndActiveCalls(req) {
  const tid = parseTid(req);
  const list = getTenantCallStore(tid);
  const callerId = String(req.user?.id || '');
  const callerEmail = String(req.user?.email || '').trim().toLowerCase();
  const cutoffMs = Date.now() - 12 * 3600 * 1000;

  const recentActive = list.filter((c) => {
    if (!['RINGING', 'ACTIVE'].includes(c.status)) return false;
    const t = new Date(c.startedAt).getTime();
    return Number.isFinite(t) && t >= cutoffMs;
  });

  const incomingCalls = recentActive.filter(
    (c) => c.status === 'RINGING' && doesCallTargetUser(c, req.user)
  );
  const activeConferences = recentActive.filter((c) => c.callScope !== 'DIRECT');
  const myCalls = list
    .filter(
      (c) =>
        String(c.initiatorUserId) === callerId ||
        (callerEmail && c.initiatorEmail === callerEmail) ||
        doesCallTargetUser(c, req.user)
    )
    .slice(0, 20);

  return {
    incomingCalls,
    activeConferences,
    recentCalls: myCalls.map(({ signals, ...rest }) => rest)
  };
}

async function answerOrJoinCall(req) {
  const tid = parseTid(req);
  const callId = req.params.callId;
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

  return updatedSession;
}

async function declineCall(req) {
  const tid = parseTid(req);
  const callId = req.params.callId;
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
  const tid = parseTid(req);
  const callId = req.params.callId;
  let updatedSession = null;

  saveTenantCallStore(tid, (list) =>
    list.map((c) => {
      if (String(c.id) !== String(callId) && String(c.roomCode) !== String(callId)) return c;
      updatedSession = {
        ...c,
        status: 'ENDED',
        endedAt: new Date().toISOString()
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
    endedBy: formatCallerName(req.user)
  });
  return updatedSession;
}

async function postSignalOrChat(req) {
  const tid = parseTid(req);
  const callId = req.params.callId;
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

      if (!body.signalType) {
        throw new AppError('signalType (OFFER, ANSWER, or ICE_CANDIDATE) or chatText is required.', 400);
      }

      const sig = {
        id: `SIG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        senderId,
        senderEmail: String(req.user?.email || '').trim().toLowerCase() || null,
        senderName,
        targetUserId: body.targetUserId ? String(body.targetUserId) : null,
        signalType: String(body.signalType).toUpperCase(),
        payload: body.payload || null,
        createdAt: new Date().toISOString()
      };
      recordedItem = sig;
      updatedCall = {
        ...c,
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
    ...recordedItem
  });

  return {
    callId: updatedCall.id,
    roomCode: targetRoomCode,
    recorded: recordedItem,
    participants: updatedCall.participants
  };
}

async function getCallState(req) {
  const tid = parseTid(req);
  const call = getCallByIdOrFail(tid, req.params.callId);
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
      roomCode: call.roomCode,
      callScope: call.callScope,
      mediaMode: call.mediaMode,
      title: call.title,
      initiatorUserId: call.initiatorUserId,
      initiatorName: call.initiatorName,
      initiatorRole: call.initiatorRole,
      targetUserId: call.targetUserId,
      targetName: call.targetName,
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

module.exports = {
  getCallDirectory,
  initiateCall,
  getIncomingAndActiveCalls,
  answerOrJoinCall,
  declineCall,
  endCall,
  postSignalOrChat,
  getCallState
};
