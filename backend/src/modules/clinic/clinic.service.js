'use strict';

const prisma = require('../../core/database/prisma.client');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const { AppError } = require('../../middleware/error.middleware');
const logger = require('../../utils/logger') || console;

const STARTER_PHARMACY_INVENTORY = (tenantId) => [
  { id: `med_para_${tenantId}`, tenantId, itemName: 'Paracetamol 500mg Tablets', category: 'ANALGESIC', quantity: 250, reorderLevel: 40, unit: 'tablets' },
  { id: `med_ors_${tenantId}`, tenantId, itemName: 'Oral Rehydration Salts (ORS)', category: 'HYDRATION', quantity: 120, reorderLevel: 25, unit: 'sachets' },
  { id: `med_aid_${tenantId}`, tenantId, itemName: 'Sterile First-Aid Dressing & Antiseptic Kit', category: 'WOUND_CARE', quantity: 80, reorderLevel: 15, unit: 'kits' },
  { id: `med_asthma_${tenantId}`, tenantId, itemName: 'Salbutamol Rescue Inhaler', category: 'RESPIRATORY', quantity: 18, reorderLevel: 5, unit: 'inhalers' },
  { id: `med_anti_${tenantId}`, tenantId, itemName: 'Cetirizine Antihistamine 10mg', category: 'ALLERGY', quantity: 140, reorderLevel: 30, unit: 'tablets' },
  { id: `med_mal_${tenantId}`, tenantId, itemName: 'Artemether/Lumefantrine First-Line Pack', category: 'ANTIMALARIAL', quantity: 45, reorderLevel: 12, unit: 'packs' }
];

function resolveTidStr(req) {
  return String(parseInt(req?.tenantId || req?.user?.tenantId || '1', 10) || 1);
}

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase();
}

// Strictly ONLY School Doctors & Nurses operate the School Clinic Dashboard
const CLINIC_OPERATOR_ROLES = new Set(['CLINIC_DOCTOR', 'CLINIC_NURSE', 'DOCTOR', 'NURSE', 'CLINIC']);

function isClinicOperatorRole(role) {
  return CLINIC_OPERATOR_ROLES.has(String(role || '').trim().toUpperCase());
}

function matchesCallerIdentity(profileRecord, user) {
  if (!profileRecord || !user) return false;
  const callerEmail = normalizeEmail(user.email);
  const callerId = String(user.id || '').trim();
  const callerName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
  const recEmail = normalizeEmail(profileRecord.email);
  const recId = String(profileRecord.personId || '').trim();
  const recName = String(profileRecord.fullName || '').trim().toLowerCase();

  if (callerEmail && recEmail && recEmail === callerEmail) return true;
  if (callerId && recId && recId === callerId) return true;
  if (callerName && recName && recName === callerName) return true;
  return false;
}

function matchesParentWardProfile(profileRecord, user) {
  if (!profileRecord || !user) return false;
  const callerEmail = normalizeEmail(user.email);
  const callerPhone = String(user.phone || '').replace(/\D+/g, '');
  const emergencyPhone = String(profileRecord.emergencyContactPhone || '').replace(/\D+/g, '');
  if (callerEmail && normalizeEmail(profileRecord.email) === callerEmail) return true;
  if (callerPhone.length >= 6 && emergencyPhone && emergencyPhone.includes(callerPhone.slice(-8))) return true;
  return false;
}

/**
 * Automatically creates or updates a Student / Teacher / Staff Admission Medical Profile.
 * Safe non-throwing integration hook for Admissions, Auth Registration, and Clinic Intake.
 */
function syncAdmissionMedicalProfile(tenantId, payload = {}) {
  try {
    const tid = String(parseInt(tenantId || '1', 10) || 1);
    const fullName = String(
      payload.fullName ||
      `${payload.firstName || ''} ${payload.lastName || ''}`.trim() ||
      payload.studentName ||
      payload.teacherName ||
      ''
    ).trim();
    const email = normalizeEmail(payload.email || payload.studentEmail);
    const personRole = String(payload.personRole || payload.role || 'STUDENT').trim().toUpperCase();
    const personId = String(payload.personId || payload.userId || email || `MED-${Date.now()}`).trim();

    if (!fullName && !email) return null;

    let savedRecord = null;
    writePersistentStore((curr) => {
      const existingList = Array.isArray(curr.schoolClinicProfiles) ? curr.schoolClinicProfiles : [];
      const idx = existingList.findIndex(
        (p) =>
          String(p.tenantId || '1') === tid &&
          ((email && normalizeEmail(p.email) === email) ||
            (personId && String(p.personId) === personId) ||
            (fullName && String(p.fullName || '').toLowerCase() === fullName.toLowerCase()))
      );

      const now = new Date().toISOString();
      const baseExisting = idx >= 0 ? existingList[idx] : {};

      savedRecord = {
        id: baseExisting.id || `CLP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        tenantId: tid,
        personId: baseExisting.personId || personId,
        personRole: payload.personRole ? personRole : (baseExisting.personRole || personRole),
        fullName: fullName || baseExisting.fullName || email,
        email: email || baseExisting.email || null,
        phone: payload.phone || baseExisting.phone || null,
        admissionNumber:
          payload.admissionNumber ||
          payload.applicationNumber ||
          payload.employeeId ||
          baseExisting.admissionNumber ||
          `${personRole === 'TEACHER' ? 'TCH' : personRole === 'STAFF' ? 'STF' : 'ADM'}-${String(Date.now()).slice(-6)}`,
        classOrDepartment:
          payload.classOrDepartment ||
          payload.targetClassName ||
          payload.department ||
          payload.className ||
          baseExisting.classOrDepartment ||
          (personRole === 'TEACHER' ? 'Academic Faculty' : personRole === 'STAFF' ? 'Campus Operations' : 'Enrolled Class'),
        admissionDate: payload.admissionDate || baseExisting.admissionDate || now.slice(0, 10),
        bloodGroup: payload.bloodGroup || baseExisting.bloodGroup || 'Pending Screening',
        genotype: payload.genotype || baseExisting.genotype || 'Pending Screening',
        allergies: payload.allergies || baseExisting.allergies || 'None Reported',
        chronicConditions: payload.chronicConditions || payload.medicalNotes || baseExisting.chronicConditions || 'None Reported',
        immunizationStatus: payload.immunizationStatus || baseExisting.immunizationStatus || 'Verified at Admission',
        nhisNumber: payload.nhisNumber || baseExisting.nhisNumber || '',
        emergencyContactName: payload.emergencyContactName || payload.guardianName || baseExisting.emergencyContactName || 'Parent / Next of Kin',
        emergencyContactPhone: payload.emergencyContactPhone || payload.guardianPhone || payload.phone || baseExisting.emergencyContactPhone || '',
        medicalClearanceStatus: payload.medicalClearanceStatus || baseExisting.medicalClearanceStatus || 'CLEARED',
        sourceSystem: payload.sourceSystem || baseExisting.sourceSystem || 'INSTITUTIONAL_ADMISSION',
        registeredAt: baseExisting.registeredAt || now,
        updatedAt: now
      };

      const nextList = [...existingList];
      if (idx >= 0) {
        nextList[idx] = savedRecord;
      } else {
        nextList.unshift(savedRecord);
      }
      return { ...curr, schoolClinicProfiles: nextList.slice(0, 2000) };
    });

    return savedRecord;
  } catch (err) {
    if (logger.warn) logger.warn(`Clinic profile sync warning: ${err.message}`);
    return null;
  }
}

/**
 * Merges Clinic Medical Profiles with ALL admitted students and registered teachers/staff across PG & JSON Store
 */
async function listClinicProfiles(req) {
  const tidStr = resolveTidStr(req);
  const tidNum = parseInt(tidStr, 10) || 1;
  const store = readPersistentStore();

  const profileMap = new Map();
  const addOrMergeProfile = (rec) => {
    const key = normalizeEmail(rec.email) || `${rec.personRole}_${String(rec.fullName || rec.personId).toLowerCase()}`;
    if (!key) return;
    if (!profileMap.has(key)) {
      profileMap.set(key, rec);
    }
  };

  // 1. Explicit clinic profiles saved for this tenant
  (store.schoolClinicProfiles || [])
    .filter((p) => String(p.tenantId || '1') === tidStr)
    .forEach(addOrMergeProfile);

  // 2. Registered & approved Users (Students + Teachers + Staff) from persistent store
  const storeUsers = [
    ...(Array.isArray(store.registeredUsers) ? store.registeredUsers : []),
    ...(Array.isArray(store.users) ? store.users : []),
    ...(Array.isArray(store.staffAccounts) ? store.staffAccounts : [])
  ].filter(
    (u) =>
      u &&
      !u.isDeleted &&
      String(u.tenantId || '1') === tidStr &&
      ['STUDENT', 'TEACHER', 'STAFF', 'HR', 'ACCOUNTANT', 'SECRETARY', 'ADMIN', 'SUPER_ADMIN', 'CLINIC_DOCTOR', 'CLINIC_NURSE'].includes(String(u.role || '').toUpperCase())
  );

  storeUsers.forEach((u) => {
    const email = normalizeEmail(u.email);
    const key = email || `${u.role}_${String(`${u.firstName || ''} ${u.lastName || ''}`).trim().toLowerCase()}`;
    if (!profileMap.has(key)) {
      addOrMergeProfile({
        id: `auto_usr_${u.id || Date.now()}`,
        tenantId: tidStr,
        personId: String(u.id || email),
        personRole: String(u.role || 'STUDENT').toUpperCase(),
        fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email,
        email: u.email || null,
        phone: u.phone || null,
        admissionNumber: u.admissionNumber || u.employeeId || `REG-${String(u.id || '').slice(-4) || '001'}`,
        classOrDepartment: u.department || u.className || u.level || (String(u.role).toUpperCase() === 'TEACHER' ? 'Academic Faculty' : 'Enrolled Roster'),
        admissionDate: (u.createdAt || new Date().toISOString()).slice(0, 10),
        bloodGroup: u.bloodGroup || 'Pending Screening',
        genotype: u.genotype || 'Pending Screening',
        allergies: u.allergies || 'None Reported',
        chronicConditions: u.medicalNotes || 'None Reported',
        immunizationStatus: 'Recorded in Admission Portal',
        nhisNumber: u.nhisNumber || '',
        emergencyContactName: u.emergencyContactName || 'Parent / Next of Kin',
        emergencyContactPhone: u.emergencyContactPhone || u.phone || '',
        medicalClearanceStatus: 'CLEARED',
        sourceSystem: 'USER_REGISTRATION',
        registeredAt: u.createdAt || new Date().toISOString()
      });
    }
  });

  // 3. Prisma database users + admission applications when PostgreSQL is active
  try {
    const dbUsers = await prisma.user.findMany({
      where: { tenantId: tidNum, isDeleted: false, role: { in: ['STUDENT', 'TEACHER', 'STAFF'] } },
      include: { registrationProfile: true }
    }).catch(() => []);
    dbUsers.forEach((u) => {
      const rp = u.registrationProfile || {};
      const key = normalizeEmail(u.email) || `db_${u.id}`;
      if (!profileMap.has(key)) {
        addOrMergeProfile({
          id: `db_usr_${u.id}`,
          tenantId: tidStr,
          personId: String(u.id),
          personRole: u.role,
          fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          email: u.email,
          phone: rp.phone || u.phone || null,
          admissionNumber: rp.employeeId || `GBS-${u.id}`,
          classOrDepartment: rp.department || (u.role === 'TEACHER' ? 'Academic Faculty' : 'Enrolled Student'),
          admissionDate: new Date(u.createdAt || Date.now()).toISOString().slice(0, 10),
          bloodGroup: rp.bloodGroup || 'Pending Screening',
          genotype: 'Pending Screening',
          allergies: 'None Reported',
          chronicConditions: rp.medicalNotes || 'None Reported',
          immunizationStatus: 'Recorded at Registration',
          nhisNumber: '',
          emergencyContactName: rp.emergencyContactName || 'Parent / Guardian',
          emergencyContactPhone: rp.emergencyContactPhone || rp.phone || '',
          medicalClearanceStatus: 'CLEARED',
          sourceSystem: 'PRISMA_DIRECTORY',
          registeredAt: u.createdAt
        });
      }
    });

    const dbAdmissions = await prisma.admissionApplication.findMany({
      where: { tenantId: tidNum }
    }).catch(() => []);
    dbAdmissions.forEach((app) => {
      const fullName = `${app.studentFirstName || ''} ${app.studentLastName || ''}`.trim();
      const email = normalizeEmail(app.guardianEmail);
      const key = `${email || 'adm'}_${fullName.toLowerCase()}`;
      if (!profileMap.has(key)) {
        addOrMergeProfile({
          id: `adm_${app.id}`,
          tenantId: tidStr,
          personId: String(app.enrolledUserId || app.id),
          personRole: 'STUDENT',
          fullName,
          email: app.guardianEmail || null,
          phone: app.guardianPhone || null,
          admissionNumber: app.applicationNumber,
          classOrDepartment: `Grade ${app.targetGradeLevel || 10} (${app.stage})`,
          admissionDate: new Date(app.enrolledAt || app.createdAt || Date.now()).toISOString().slice(0, 10),
          bloodGroup: 'Pending Screening',
          genotype: 'Pending Screening',
          allergies: 'None Reported',
          chronicConditions: 'None Reported',
          immunizationStatus: `Admission ${app.stage}`,
          nhisNumber: '',
          emergencyContactName: app.guardianName || 'Parent / Guardian',
          emergencyContactPhone: app.guardianPhone || '',
          medicalClearanceStatus: 'CLEARED',
          sourceSystem: 'ADMISSIONS_PIPELINE',
          registeredAt: app.createdAt
        });
      }
    });
  } catch { }

  const allProfiles = Array.from(profileMap.values());
  const role = String(req.user?.role || '').toUpperCase();
  if (isClinicOperatorRole(role)) {
    return allProfiles;
  }

  // Strictly personal read-only health status visibility for all non-Clinic roles (never expose school-wide clinic operations)
  if (role === 'PARENT') {
    const parentMatches = allProfiles.filter((p) => matchesParentWardProfile(p, req.user));
    if (parentMatches.length > 0) return parentMatches;
    const isDemo = String(req.headers?.['x-system-mode'] || '').toUpperCase() === 'DEMO_SANDBOX';
    return isDemo ? allProfiles.filter((p) => p.personRole === 'STUDENT').slice(0, 1) : [];
  }

  const ownMatches = allProfiles.filter((p) => matchesCallerIdentity(p, req.user));
  if (ownMatches.length > 0) return ownMatches;
  if (req.user) {
    return [
      {
        id: `self_${req.user.id || 'user'}`,
        tenantId: tidStr,
        personId: String(req.user.id || ''),
        personRole: role || 'USER',
        fullName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email || 'Authenticated User',
        email: req.user.email || null,
        phone: req.user.phone || null,
        admissionNumber: req.user.admissionNumber || req.user.employeeId || 'SELF-PROFILE',
        classOrDepartment: req.user.department || req.user.className || 'Personal Health File',
        admissionDate: new Date().toISOString().slice(0, 10),
        bloodGroup: req.user.bloodGroup || 'Pending Screening',
        genotype: req.user.genotype || 'Pending Screening',
        allergies: req.user.allergies || 'None Reported',
        chronicConditions: req.user.medicalNotes || 'None Reported',
        immunizationStatus: 'Personal Health File',
        nhisNumber: req.user.nhisNumber || '',
        emergencyContactName: req.user.emergencyContactName || 'Parent / Next of Kin',
        emergencyContactPhone: req.user.emergencyContactPhone || req.user.phone || '',
        medicalClearanceStatus: 'CLEARED',
        sourceSystem: 'PERSONAL_SELF_HEALTH'
      }
    ];
  }
  return [];
}

async function listClinicVisits(req) {
  const tidStr = resolveTidStr(req);
  const store = readPersistentStore();
  let visits = (store.schoolClinicVisits || []).filter((v) => String(v.tenantId || '1') === tidStr);

  const role = String(req.user?.role || '').toUpperCase();
  const isClinicOperatorView = isClinicOperatorRole(role);
  const callerEmail = normalizeEmail(req.user?.email);
  const callerPhoneDigits = String(req.user?.phone || '').replace(/\D+/g, '');

  if (!isClinicOperatorView) {
    if (role === 'PARENT') {
      visits = visits.filter((v) => {
        if (v.patientRole !== 'STUDENT') return false;
        if (callerEmail && normalizeEmail(v.guardianEmail) === callerEmail) return true;
        const emDigits = String(v.emergencyPhone || '').replace(/\D+/g, '');
        return callerPhoneDigits.length >= 6 && emDigits.includes(callerPhoneDigits.slice(-8));
      });
    } else {
      visits = visits.filter((v) =>
        matchesCallerIdentity(
          { email: v.patientEmail, personId: v.patientId, fullName: v.patientName },
          req.user
        )
      );
    }
  }

  const profiles = await listClinicProfiles(req);
  const activeSickbay = visits.filter((v) => v.disposition === 'ADMITTED_TO_SICKBAY' && !v.dischargedAt);

  if (!isClinicOperatorView) {
    return {
      ownHealthOnly: true,
      readOnly: true,
      visits,
      summary: null
    };
  }

  const inventory = listInventoryInternal(tidStr, store);

  return {
    ownHealthOnly: false,
    visits,
    summary: {
      ownHealthOnly: false,
      totalRegisteredProfiles: profiles.length,
      studentMedicalProfiles: profiles.filter((p) => p.personRole === 'STUDENT').length,
      teacherAndStaffMedicalProfiles: profiles.filter((p) => p.personRole !== 'STUDENT').length,
      totalClinicVisits: visits.length,
      studentVisits: visits.filter((v) => v.patientRole === 'STUDENT').length,
      teacherAndStaffVisits: visits.filter((v) => v.patientRole !== 'STUDENT').length,
      activeSickbayCount: activeSickbay.length,
      activeSickbayPatients: activeSickbay.map((s) => ({
        id: s.id,
        patientName: s.patientName,
        patientRole: s.patientRole,
        classOrDepartment: s.classOrDepartment,
        diagnosis: s.diagnosis,
        admittedAt: s.admittedAt || s.createdAt
      })),
      lowStockItemsCount: inventory.filter((m) => Number(m.quantity) <= Number(m.reorderLevel)).length
    }
  };
}

function listInventoryInternal(tidStr, store) {
  let items = (store.schoolClinicInventory || []).filter((m) => String(m.tenantId || '1') === tidStr);
  if (items.length === 0) {
    items = STARTER_PHARMACY_INVENTORY(tidStr);
    writePersistentStore((curr) => ({
      ...curr,
      schoolClinicInventory: [...items, ...(curr.schoolClinicInventory || [])]
    }));
  }
  return items;
}

async function listInventory(req) {
  const tidStr = resolveTidStr(req);
  const store = readPersistentStore();
  return listInventoryInternal(tidStr, store);
}

async function upsertInventoryItem(req) {
  const tidStr = resolveTidStr(req);
  const body = req.body || {};
  const itemName = String(body.itemName || '').trim();
  if (!itemName) throw new AppError('Medicine or medical supply name is required.', 400);

  let savedItem = null;
  writePersistentStore((curr) => {
    const list = listInventoryInternal(tidStr, curr);
    const existingIdx = (curr.schoolClinicInventory || []).findIndex(
      (i) => String(i.tenantId || '1') === tidStr && String(i.itemName || '').toLowerCase() === itemName.toLowerCase()
    );

    if (existingIdx >= 0) {
      const existing = curr.schoolClinicInventory[existingIdx];
      savedItem = {
        ...existing,
        quantity: body.addStock != null
          ? Math.max(0, Number(existing.quantity || 0) + Number(body.addStock || 0))
          : Math.max(0, Number(body.quantity ?? existing.quantity)),
        reorderLevel: Number(body.reorderLevel ?? existing.reorderLevel ?? 10),
        updatedAt: new Date().toISOString()
      };
      const next = [...(curr.schoolClinicInventory || [])];
      next[existingIdx] = savedItem;
      return { ...curr, schoolClinicInventory: next };
    }

    savedItem = {
      id: `med_${Date.now()}`,
      tenantId: tidStr,
      itemName,
      category: String(body.category || 'GENERAL').toUpperCase(),
      quantity: Math.max(0, Number(body.quantity || body.addStock || 50)),
      reorderLevel: Math.max(1, Number(body.reorderLevel || 15)),
      unit: String(body.unit || 'units').trim(),
      createdAt: new Date().toISOString()
    };
    return { ...curr, schoolClinicInventory: [savedItem, ...(curr.schoolClinicInventory || list)] };
  });

  return savedItem;
}

async function admitOrTreatPatient(req) {
  const tidStr = resolveTidStr(req);
  const body = req.body || {};
  const patientName = String(body.patientName || '').trim();
  const patientRole = String(body.patientRole || 'STUDENT').trim().toUpperCase();
  const chiefComplaint = String(body.chiefComplaint || body.symptoms || '').trim();
  const diagnosis = String(body.diagnosis || chiefComplaint || 'General Clinical Evaluation').trim();

  if (!patientName || !chiefComplaint) {
    throw new AppError('Patient Name and Symptoms / Chief Complaint are required to admit or treat in the School Clinic.', 400);
  }

  // Ensure patient also has a baseline admission medical profile linked
  const linkedProfile = syncAdmissionMedicalProfile(tidStr, {
    personId: body.patientId || body.personId,
    personRole: patientRole,
    fullName: patientName,
    email: body.patientEmail,
    phone: body.patientPhone,
    admissionNumber: body.admissionNumber,
    classOrDepartment: body.classOrDepartment,
    bloodGroup: body.bloodGroup,
    genotype: body.genotype,
    allergies: body.allergies,
    emergencyContactPhone: body.emergencyPhone,
    medicalClearanceStatus: body.disposition === 'ADMITTED_TO_SICKBAY' ? 'MONITORING' : 'CLEARED',
    sourceSystem: 'CLINIC_INTAKE'
  });

  const clinician = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.role || 'School Clinic Nurse';
  const medDispensed = String(body.medicationDispensed || '').trim();
  const dosageQty = Math.max(0, parseInt(body.dosageQty || 1, 10) || 1);
  const disposition = String(body.disposition || 'TREATED_AND_RETURNED_TO_CLASS').trim().toUpperCase();

  const visitRecord = {
    id: `CLV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    tenantId: tidStr,
    profileId: linkedProfile?.id || null,
    patientId: linkedProfile?.personId || body.patientId || patientName,
    patientName,
    patientRole,
    patientEmail: normalizeEmail(body.patientEmail || linkedProfile?.email),
    guardianEmail: normalizeEmail(body.guardianEmail || linkedProfile?.email),
    admissionNumber: body.admissionNumber || linkedProfile?.admissionNumber || '',
    classOrDepartment: body.classOrDepartment || linkedProfile?.classOrDepartment || (patientRole === 'TEACHER' ? 'Academic Faculty' : 'Assigned Class'),
    emergencyPhone: body.emergencyPhone || linkedProfile?.emergencyContactPhone || '',
    vitals: {
      temperatureC: String(body.temperatureC || '36.8'),
      bloodPressure: String(body.bloodPressure || '115/75'),
      pulseBpm: String(body.pulseBpm || '76'),
      weightKg: String(body.weightKg || '')
    },
    chiefComplaint,
    diagnosis,
    treatmentGiven: String(body.treatmentGiven || 'Rest, hydration & clinical observation').trim(),
    medicationDispensed: medDispensed,
    dosageQty: medDispensed ? dosageQty : 0,
    disposition,
    attendingClinician: clinician,
    clinicFeeAmount: Math.max(0, Number(body.clinicFeeAmount || 0)),
    parentNotified: false,
    admittedAt: disposition === 'ADMITTED_TO_SICKBAY' ? new Date().toISOString() : null,
    dischargedAt: null,
    followUpNotes: String(body.followUpNotes || '').trim(),
    createdAt: new Date().toISOString()
  };

  // Optional automated SMS notification to emergency contact / parent / admin inbox
  if (body.notifyEmergencyContact && visitRecord.emergencyPhone) {
    try {
      const smsService = require('../sms/sms.service');
      await smsService.sendDirectUserSMS({
        tenantId: parseInt(tidStr, 10) || 1,
        senderName: `${clinician} (School Clinic)`,
        senderRole: String(req.user?.role || 'STAFF').toUpperCase(),
        senderEmail: req.user?.email || null,
        recipientName: linkedProfile?.emergencyContactName || 'Parent / Emergency Contact',
        recipientRole: patientRole === 'STUDENT' ? 'PARENT' : 'ADMIN',
        recipientPhone: visitRecord.emergencyPhone,
        recipientEmail: body.guardianEmail || linkedProfile?.email || null,
        subject: `School Clinic Update: ${patientName}`,
        message: `School Clinic Alert: ${patientName} (${patientRole}) visited the clinic for "${chiefComplaint}". Status: ${disposition}. Diagnosis/Care: ${diagnosis}.`
      });
      visitRecord.parentNotified = true;
    } catch { }
  }

  writePersistentStore((curr) => {
    const currentInv = Array.isArray(curr.schoolClinicInventory) ? curr.schoolClinicInventory : [];
    const hasTenantInv = currentInv.some((i) => String(i.tenantId || '1') === tidStr);
    const seededInv = hasTenantInv ? currentInv : [...STARTER_PHARMACY_INVENTORY(tidStr), ...currentInv];
    const nextInv = seededInv.map((med) => {
      if (
        medDispensed &&
        String(med.tenantId || '1') === tidStr &&
        String(med.itemName || '').toLowerCase().includes(medDispensed.toLowerCase())
      ) {
        return { ...med, quantity: Math.max(0, Number(med.quantity || 0) - dosageQty) };
      }
      return med;
    });

    return {
      ...curr,
      schoolClinicInventory: nextInv,
      schoolClinicVisits: [visitRecord, ...(curr.schoolClinicVisits || [])].slice(0, 2000)
    };
  });

  return visitRecord;
}

async function updateClinicVisit(req, visitId) {
  const tidStr = resolveTidStr(req);
  const body = req.body || {};
  let updated = null;

  writePersistentStore((curr) => {
    const next = (curr.schoolClinicVisits || []).map((v) => {
      if (String(v.id) === String(visitId) && String(v.tenantId || '1') === tidStr) {
        const nextDisposition = body.disposition ? String(body.disposition).toUpperCase() : v.disposition;
        const discharged =
          body.discharge === true ||
          ['DISCHARGED', 'TREATED_AND_RETURNED_TO_CLASS', 'RETURNED_TO_DUTY', 'SENT_HOME_TO_PARENT'].includes(nextDisposition);
        updated = {
          ...v,
          disposition: nextDisposition,
          followUpNotes: body.followUpNotes != null ? String(body.followUpNotes).trim() : v.followUpNotes,
          dischargedAt: discharged ? (v.dischargedAt || new Date().toISOString()) : v.dischargedAt,
          dischargedBy: discharged ? (`${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.role || 'Clinician') : v.dischargedBy,
          updatedAt: new Date().toISOString()
        };
        return updated;
      }
      return v;
    });
    return { ...curr, schoolClinicVisits: next };
  });

  if (!updated) throw new AppError('Clinic consultation or sickbay record not found.', 404);
  return updated;
}

/**
 * Unified Cross-Portal Record Pull:
 * - Headmasters see all Staff & Student admission medical dossiers, visit histories & clinic SMS alerts.
 * - Regular users (Student, Teacher, Staff, HR, Accountant, Parent) only retrieve their own (or ward's) health info.
 */
async function pullPatientMedicalDossier(req, rawQuery = '') {
  const tidStr = resolveTidStr(req);
  const role = String(req.user?.role || '').toUpperCase();
  const isClinicOperatorView = isClinicOperatorRole(role);
  if (!isClinicOperatorView) {
    throw new AppError('Access Denied: Only School Clinic Doctors and Nurses may pull cross-campus medical dossiers.', 403);
  }
  const q = String(rawQuery || '').trim().toLowerCase();
  const profiles = await listClinicProfiles(req);
  const { visits } = await listClinicVisits(req);
  const store = readPersistentStore();

  const matchesProfile = (p) =>
    !q ||
    String(p.fullName || '').toLowerCase().includes(q) ||
    String(p.email || '').toLowerCase().includes(q) ||
    String(p.admissionNumber || '').toLowerCase().includes(q) ||
    String(p.phone || '').toLowerCase().includes(q) ||
    String(p.classOrDepartment || '').toLowerCase().includes(q) ||
    String(p.personId || '').toLowerCase().includes(q);

  const matchedProfiles = profiles.filter(matchesProfile);
  const matchedVisits = visits.filter(
    (v) =>
      !q ||
      String(v.patientName || '').toLowerCase().includes(q) ||
      String(v.patientEmail || '').toLowerCase().includes(q) ||
      String(v.admissionNumber || '').toLowerCase().includes(q) ||
      String(v.diagnosis || '').toLowerCase().includes(q)
  );

  const clinicSmsAlerts = (store.dispatchedSmsMessages || []).filter(
    (m) =>
      String(m.tenantId || '1') === tidStr &&
      String(m.subject || m.rawMessage || '').toLowerCase().includes('clinic') &&
      (!q || String(m.rawMessage || m.subject || m.recipientName || '').toLowerCase().includes(q))
  );

  return {
    ownHealthOnly: false,
    query: rawQuery,
    matchedProfiles,
    matchedVisits,
    clinicSmsAlerts,
    totalProfilesMatched: matchedProfiles.length,
    totalVisitsMatched: matchedVisits.length,
    pulledAt: new Date().toISOString()
  };
}

module.exports = {
  getStatus: async () => {
    const store = readPersistentStore();
    return {
      module: 'school_clinic_medical_hub',
      status: 'OPERATIONAL',
      totalProfiles: (store.schoolClinicProfiles || []).length,
      totalVisits: (store.schoolClinicVisits || []).length,
      timestamp: new Date().toISOString()
    };
  },
  syncAdmissionMedicalProfile,
  listClinicProfiles,
  listClinicVisits,
  admitOrTreatPatient,
  updateClinicVisit,
  pullPatientMedicalDossier,
  listInventory,
  upsertInventoryItem
};
