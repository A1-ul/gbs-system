'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');

/**
 * Generates unique enterprise admission application number: ADM-2026-XXXX
 */
function generateApplicationNumber() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ADM-2026-${rand}`;
}

/**
 * Get Admissions Subsystem Status
 */
async function getStatus() {
  const total = await prisma.admissionApplication.count();
  return {
    module: 'admissions_workflow_engine',
    status: 'OPERATIONAL',
    totalApplications: total,
    pipelineStages: [
      'INQUIRY',
      'APPLIED',
      'DOCUMENTS_UPLOADED',
      'VERIFIED',
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_COMPLETED',
      'APPROVED',
      'REJECTED',
      'ENROLLED'
    ],
    timestamp: new Date().toISOString()
  };
}

/**
 * Stage 1: Create Initial Admission Inquiry (Blueprint Box 6)
 */
async function createInquiry(tenantId, payload, user) {
  const tid = parseInt(tenantId, 10);
  const {
    studentFirstName,
    studentLastName,
    dateOfBirth,
    targetGradeLevel,
    targetClassId,
    guardianName,
    guardianEmail,
    guardianPhone,
    guardianRelationship = 'PARENT',
    previousSchool,
    notes
  } = payload;

  const effGuardianName = guardianName || payload.parentName || 'Parent / Guardian';
  const effGuardianEmail = guardianEmail || payload.email || payload.parentEmail || 'guardian@gbs.edu';
  const effGuardianPhone = guardianPhone || payload.phone || payload.parentPhone || '+233244000000';

  if (!studentFirstName || !studentLastName) {
    throw new AppError('Student first and last names are required.', 400);
  }

  const dob = dateOfBirth ? new Date(dateOfBirth) : new Date('2011-09-01T00:00:00.000Z');
  const grade = parseInt(targetGradeLevel || payload.targetGrade, 10) || 10;
  let cid = targetClassId ? parseInt(targetClassId, 10) : null;

  // If classId specified, verify it belongs to this tenant
  if (cid) {
    const targetClass = await prisma.class.findFirst({ where: { id: cid, tenantId: tid } });
    if (!targetClass) cid = null;
  }

  const appNumber = generateApplicationNumber();

  const application = await prisma.$transaction(async (tx) => {
    const app = await tx.admissionApplication.create({
      data: {
        tenantId: tid,
        applicationNumber: appNumber,
        stage: 'INQUIRY',
        targetGradeLevel: grade,
        targetClassId: cid,
        studentFirstName: studentFirstName.trim(),
        studentLastName: studentLastName.trim(),
        dateOfBirth: dob,
        guardianName: effGuardianName.trim(),
        guardianEmail: effGuardianEmail.trim().toLowerCase(),
        guardianPhone: effGuardianPhone.trim(),
        guardianRelationship,
        previousSchool: previousSchool ? previousSchool.trim() : null,
        reviewerNotes: notes ? notes.trim() : 'Prospective family submitted admission inquiry.'
      },
      include: { targetClass: true }
    });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: user?.id,
        module: 'ADMISSION',
        action: 'ADMISSION_INQUIRY_CREATED',
        details: `Created admission inquiry ${app.applicationNumber} for student ${app.studentFirstName} ${app.studentLastName}`
      }
    });

    return app;
  });

  return application;
}

/**
 * Stage 2: Submit Full Application (Blueprint Box 6)
 */
async function submitApplication(tenantId, applicationId, payload, user) {
  const tid = parseInt(tenantId, 10);
  const aid = parseInt(applicationId, 10);

  const existing = await prisma.admissionApplication.findFirst({
    where: { id: aid, tenantId: tid }
  });
  if (!existing) {
    throw new AppError(`Admission application ID ${applicationId} not found.`, 404);
  }

  const {
    gender = 'UNSPECIFIED',
    nationality = 'International',
    previousSchool,
    previousGPA,
    address,
    targetClassId,
    targetGradeLevel
  } = payload;

  const data = {
    stage: 'APPLIED',
    gender,
    nationality,
    address: address ? address.trim() : existing.address
  };

  if (previousSchool) data.previousSchool = previousSchool.trim();
  if (previousGPA !== undefined) data.previousGPA = parseFloat(previousGPA) || null;
  if (targetGradeLevel) data.targetGradeLevel = parseInt(targetGradeLevel, 10);
  if (targetClassId) data.targetClassId = parseInt(targetClassId, 10);

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.admissionApplication.update({
      where: { id: aid },
      data,
      include: { targetClass: true, documents: true }
    });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: user?.id,
        module: 'ADMISSION',
        action: 'ADMISSION_APPLICATION_SUBMITTED',
        details: `Application ${res.applicationNumber} transitioned to APPLIED`
      }
    });

    return res;
  });

  return updated;
}

/**
 * Stage 3: Attach & Upload Verification Documents (Blueprint Box 6)
 */
async function uploadDocument(tenantId, applicationId, payload, user) {
  const tid = parseInt(tenantId, 10);
  const aid = parseInt(applicationId, 10);

  const application = await prisma.admissionApplication.findFirst({
    where: { id: aid, tenantId: tid }
  });
  if (!application) {
    throw new AppError(`Admission application ID ${applicationId} not found.`, 404);
  }

  const { documentType, fileName, fileUrl, fileSize = 204800 } = payload;
  if (!documentType || !fileName) {
    throw new AppError('documentType and fileName are required.', 400);
  }

  const docUrl = fileUrl || `https://documents.gbs.edu/admissions/${application.applicationNumber}/${fileName}`;

  const result = await prisma.$transaction(async (tx) => {
    const doc = await tx.admissionDocument.create({
      data: {
        tenantId: tid,
        applicationId: aid,
        documentType: documentType.toUpperCase(),
        fileName: fileName.trim(),
        fileUrl: docUrl,
        fileSize: parseInt(fileSize, 10),
        verificationStatus: 'PENDING'
      }
    });

    // Advance stage to DOCUMENTS_UPLOADED if currently APPLIED or INQUIRY
    if (['INQUIRY', 'APPLIED'].includes(application.stage)) {
      await tx.admissionApplication.update({
        where: { id: aid },
        data: { stage: 'DOCUMENTS_UPLOADED' }
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: user?.id,
        module: 'ADMISSION',
        action: 'ADMISSION_DOCUMENT_UPLOADED',
        details: `Uploaded ${doc.documentType} ("${doc.fileName}") for application ${application.applicationNumber}`
      }
    });

    return doc;
  });

  return result;
}

/**
 * Stage 4a: Verify Application Documents (Blueprint Box 6)
 */
async function verifyDocument(tenantId, documentId, payload, verifierUser) {
  const tid = parseInt(tenantId, 10);
  const did = parseInt(documentId, 10);

  const doc = await prisma.admissionDocument.findFirst({
    where: { id: did, tenantId: tid },
    include: { application: true }
  });
  if (!doc) {
    throw new AppError(`Document ID ${documentId} not found.`, 404);
  }

  const { status = 'VERIFIED', remarks } = payload;
  const finalStatus = status.toUpperCase();

  const updatedDoc = await prisma.$transaction(async (tx) => {
    const updated = await tx.admissionDocument.update({
      where: { id: did },
      data: {
        verificationStatus: finalStatus,
        verifiedById: verifierUser?.id,
        verificationRemarks: remarks ? remarks.trim() : `Verified by admissions officer ${verifierUser?.firstName || 'Registrar'}`
      }
    });

    // Check if all documents for this application are verified
    const allDocs = await tx.admissionDocument.findMany({
      where: { applicationId: doc.applicationId }
    });
    const allVerified = allDocs.length > 0 && allDocs.every((d) => d.verificationStatus === 'VERIFIED');

    if (allVerified) {
      await tx.admissionApplication.update({
        where: { id: doc.applicationId },
        data: { stage: 'VERIFIED' }
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: verifierUser?.id,
        module: 'ADMISSION',
        action: 'ADMISSION_DOCUMENT_VERIFIED',
        details: `Document ${did} (${doc.documentType}) marked ${finalStatus} for ${doc.application.applicationNumber}`
      }
    });

    return updated;
  });

  return updatedDoc;
}

/**
 * Stage 4b: Schedule Entrance Interview / Assessment (Blueprint Box 6)
 */
async function scheduleInterview(tenantId, applicationId, payload, officerUser) {
  const tid = parseInt(tenantId, 10);
  const aid = parseInt(applicationId, 10);

  const application = await prisma.admissionApplication.findFirst({
    where: { id: aid, tenantId: tid }
  });
  if (!application) {
    throw new AppError(`Application ID ${applicationId} not found.`, 404);
  }

  const { interviewDate, interviewer = 'Academic Admissions Committee', reviewerNotes } = payload;
  if (!interviewDate) {
    throw new AppError('interviewDate is required.', 400);
  }

  const intDate = new Date(interviewDate);
  if (isNaN(intDate.getTime())) {
    throw new AppError('Invalid date format for interview.', 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.admissionApplication.update({
      where: { id: aid },
      data: {
        stage: 'INTERVIEW_SCHEDULED',
        interviewDate: intDate,
        interviewer: interviewer.trim(),
        reviewerNotes: reviewerNotes ? reviewerNotes.trim() : application.reviewerNotes
      },
      include: { targetClass: true, documents: true }
    });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: officerUser?.id,
        module: 'ADMISSION',
        action: 'ADMISSION_INTERVIEW_SCHEDULED',
        details: `Scheduled interview for ${res.applicationNumber} on ${intDate.toISOString()} with ${interviewer}`
      }
    });

    return res;
  });

  return updated;
}

/**
 * Stage 5: Final Admission Approval & Automated Student Provisioning (Blueprint Box 6)
 */
async function approveApplication(tenantId, applicationId, payload, adminUser) {
  const tid = parseInt(tenantId, 10);
  const aid = parseInt(applicationId, 10);

  const application = await prisma.admissionApplication.findFirst({
    where: { id: aid, tenantId: tid },
    include: { targetClass: true, documents: true }
  });
  if (!application) {
    throw new AppError(`Admission application ID ${applicationId} not found.`, 404);
  }

  if (application.stage === 'APPROVED' || application.stage === 'ENROLLED') {
    throw new AppError('This application has already been approved and enrolled.', 400);
  }

  const { targetClassId, reviewerNotes } = payload || {};
  let cid = targetClassId ? parseInt(targetClassId, 10) : application.targetClassId;

  // Fallback to first available class of grade level if none specified
  if (!cid) {
    const fallbackClass = await prisma.class.findFirst({
      where: { tenantId: tid, gradeLevel: application.targetGradeLevel }
    });
    if (fallbackClass) cid = fallbackClass.id;
  }

  if (!cid) {
    const anyClass = await prisma.class.findFirst({ where: { tenantId: tid } });
    if (anyClass) cid = anyClass.id;
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Provision / Create Student User Account in PostgreSQL
    const studentEmail = `${application.studentFirstName.toLowerCase()}.${application.studentLastName.toLowerCase()}.${Date.now()}${Math.floor(Math.random() * 1000)}@gbs.edu`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Student123!', salt);

    const studentUser = await tx.user.create({
      data: {
        tenantId: tid,
        firstName: application.studentFirstName,
        lastName: application.studentLastName,
        email: studentEmail,
        password: passwordHash,
        role: 'STUDENT',
        isActive: true,
        permissions: ['view_attendance', 'view_timetable', 'view_assignments', 'join_online_classes']
      }
    });

    // 2. Provision Class Enrollment
    let enrollment = null;
    if (cid) {
      enrollment = await tx.classEnrollment.create({
        data: {
          tenantId: tid,
          classId: cid,
          studentId: studentUser.id,
          status: 'ACTIVE'
        }
      });
    }

    // 3. Link Guardian Parent if parent user exists or create parent record
    let parentUser = await tx.user.findFirst({
      where: { tenantId: tid, email: application.guardianEmail }
    });

    if (!parentUser) {
      const parentHash = await bcrypt.hash('Parent123!', salt);
      parentUser = await tx.user.create({
        data: {
          tenantId: tid,
          firstName: application.guardianName.split(' ')[0] || 'Guardian',
          lastName: application.guardianName.split(' ')[1] || 'Parent',
          email: application.guardianEmail,
          password: parentHash,
          role: 'PARENT',
          isActive: true
        }
      });
    }

    // Create ParentStudentLink
    await tx.parentStudentLink.upsert({
      where: {
        parentId_studentId: { parentId: parentUser.id, studentId: studentUser.id }
      },
      update: {
        relationship: application.guardianRelationship,
        emergencyPhone: application.guardianPhone,
        address: application.address
      },
      create: {
        tenantId: tid,
        parentId: parentUser.id,
        studentId: studentUser.id,
        relationship: application.guardianRelationship,
        isPrimaryContact: true,
        emergencyPhone: application.guardianPhone,
        address: application.address
      }
    });

    // 4. Update Application Stage to APPROVED & ENROLLED
    const approvedApp = await tx.admissionApplication.update({
      where: { id: aid },
      data: {
        stage: 'APPROVED',
        targetClassId: cid,
        enrolledUserId: studentUser.id,
        enrolledAt: new Date(),
        reviewerNotes: reviewerNotes ? reviewerNotes.trim() : 'Approved by Admissions Board. Student account provisioned.'
      },
      include: { targetClass: true, documents: true }
    });

    // 5. Immutable Audit Trail
    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: adminUser?.id,
        module: 'ADMISSION',
        action: 'ADMISSION_APPLICATION_APPROVED',
        details: `Approved application ${application.applicationNumber}. Provisioned student account ${studentUser.email} (ID: ${studentUser.id}) into class ${cid}`
      }
    });

    return {
      application: approvedApp,
      studentUser: {
        id: studentUser.id,
        firstName: studentUser.firstName,
        lastName: studentUser.lastName,
        name: `${studentUser.firstName} ${studentUser.lastName}`,
        email: studentUser.email,
        role: studentUser.role
      },
      enrollment,
      parentUser: {
        id: parentUser.id,
        firstName: parentUser.firstName,
        lastName: parentUser.lastName,
        name: `${parentUser.firstName} ${parentUser.lastName}`,
        email: parentUser.email
      },
      parentLink: {
        parentId: parentUser.id,
        studentId: studentUser.id
      }
    };
  });

  return result;
}

/**
 * Reject Admission Application
 */
async function rejectApplication(tenantId, applicationId, payload, adminUser) {
  const tid = parseInt(tenantId, 10);
  const aid = parseInt(applicationId, 10);

  const application = await prisma.admissionApplication.findFirst({
    where: { id: aid, tenantId: tid }
  });
  if (!application) {
    throw new AppError(`Application ID ${applicationId} not found.`, 404);
  }

  const { reason = 'Did not meet current academic intake criteria' } = payload || {};

  const rejected = await prisma.$transaction(async (tx) => {
    const res = await tx.admissionApplication.update({
      where: { id: aid },
      data: {
        stage: 'REJECTED',
        rejectionReason: reason.trim()
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId: tid,
        userId: adminUser?.id,
        module: 'ADMISSION',
        action: 'ADMISSION_APPLICATION_REJECTED',
        details: `Rejected admission application ${application.applicationNumber}. Reason: ${reason}`
      }
    });

    return res;
  });

  return rejected;
}

/**
 * List Applications with filtering
 */
async function getApplications(tenantId, query = {}) {
  const tid = parseInt(tenantId, 10);
  const { stage, targetGradeLevel, targetClassId, search } = query;

  const where = { tenantId: tid };
  if (stage) where.stage = stage.toUpperCase();
  if (targetGradeLevel) where.targetGradeLevel = parseInt(targetGradeLevel, 10);
  if (targetClassId) where.targetClassId = parseInt(targetClassId, 10);
  if (search) {
    where.OR = [
      { studentFirstName: { contains: search, mode: 'insensitive' } },
      { studentLastName: { contains: search, mode: 'insensitive' } },
      { applicationNumber: { contains: search, mode: 'insensitive' } },
      { guardianEmail: { contains: search, mode: 'insensitive' } }
    ];
  }

  const applications = await prisma.admissionApplication.findMany({
    where,
    include: {
      targetClass: { select: { id: true, name: true, code: true } },
      documents: true,
      _count: { select: { documents: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return applications;
}

/**
 * Get Application by ID
 */
async function getApplicationById(tenantId, applicationId) {
  const tid = parseInt(tenantId, 10);
  const aid = parseInt(applicationId, 10);

  const application = await prisma.admissionApplication.findFirst({
    where: { id: aid, tenantId: tid },
    include: {
      targetClass: true,
      documents: true
    }
  });

  if (!application) {
    throw new AppError(`Application ID ${applicationId} not found.`, 404);
  }

  return application;
}

/**
 * Admissions Pipeline Analytics (Blueprint Box 6)
 */
async function getAnalytics(tenantId) {
  const tid = parseInt(tenantId, 10);

  const allApps = await prisma.admissionApplication.findMany({
    where: { tenantId: tid },
    select: { stage: true }
  });

  const total = allApps.length;
  const stagesCount = {
    INQUIRY: allApps.filter((a) => a.stage === 'INQUIRY').length,
    APPLIED: allApps.filter((a) => a.stage === 'APPLIED').length,
    DOCUMENTS_UPLOADED: allApps.filter((a) => a.stage === 'DOCUMENTS_UPLOADED').length,
    VERIFIED: allApps.filter((a) => a.stage === 'VERIFIED').length,
    INTERVIEW_SCHEDULED: allApps.filter((a) => a.stage === 'INTERVIEW_SCHEDULED').length,
    APPROVED: allApps.filter((a) => a.stage === 'APPROVED').length,
    REJECTED: allApps.filter((a) => a.stage === 'REJECTED').length
  };

  const approvedCount = stagesCount.APPROVED;
  const conversionRate = total > 0 ? Math.round((approvedCount / total) * 100) : 0;

  return {
    totalApplications: total,
    stagesCount,
    conversionRate
  };
}

/**
 * Delete Application
 */
async function deleteApplication(tenantId, applicationId, adminUser) {
  const tid = parseInt(tenantId, 10);
  const aid = parseInt(applicationId, 10);

  const application = await prisma.admissionApplication.findFirst({
    where: { id: aid, tenantId: tid }
  });

  if (!application) {
    throw new AppError(`Application ID ${applicationId} not found in this institution.`, 404);
  }

  // Delete related admission documents first if any
  await prisma.admissionDocument.deleteMany({
    where: { applicationId: aid }
  });

  await prisma.admissionApplication.delete({
    where: { id: aid }
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tid,
      userId: adminUser?.id,
      module: 'ADMISSION',
      action: 'ADMISSION_APPLICATION_DELETED',
      details: `Deleted admission application ${application.applicationNumber} (${application.studentFirstName} ${application.studentLastName}).`
    }
  });

  return { message: `Application ${application.applicationNumber} deleted successfully.` };
}

/**
 * Batch Delete Applications
 */
async function batchDeleteApplications(tenantId, applicationIds = [], adminUser) {
  const tid = parseInt(tenantId, 10);
  const aids = applicationIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  if (aids.length === 0) return { message: 'No applications selected.', deletedCount: 0 };

  await prisma.admissionDocument.deleteMany({
    where: { applicationId: { in: aids } }
  });

  const res = await prisma.admissionApplication.deleteMany({
    where: { id: { in: aids }, tenantId: tid }
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tid,
      userId: adminUser?.id,
      module: 'ADMISSION',
      action: 'ADMISSION_APPLICATIONS_BATCH_DELETED',
      details: `Batch deleted ${res.count} admission applications.`
    }
  });

  return { message: `Successfully deleted ${res.count} applications.`, deletedCount: res.count };
}

module.exports = {
  getStatus,
  createInquiry,
  submitApplication,
  uploadDocument,
  verifyDocument,
  scheduleInterview,
  approveApplication,
  rejectApplication,
  deleteApplication,
  batchDeleteApplications,
  getApplications,
  getApplicationById,
  getAnalytics
};