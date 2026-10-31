'use strict';

const prisma = require('../src/core/database/prisma.client');

async function testProcedure9Admissions() {
  console.log('========================================================================');
  console.log('🧪 PHASE 3, PROCEDURE 1: ADMISSION WORKFLOW ENGINE TEST SUITE');
  console.log('========================================================================\n');

  const BASE_URL = 'http://localhost:5001/api/v1';

  // 1. Authenticate Admin (Tenant 1)
  console.log('--- TEST 1: Authenticate Admin (admin@gbs.com) ---');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@gbs.com', password: 'Admin123!' })
  });
  const adminData = await adminLoginRes.json();
  if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
  const adminToken = adminData.data.accessToken;
  const adminUser = adminData.data.user;
  console.log(`✅ Admin authenticated: ${adminUser.email} (Tenant ID: ${adminUser.tenantId})`);

  // 2. Authenticate Staff (Tenant 1)
  console.log('\n--- TEST 2: Authenticate Staff (staff@gbs.com) ---');
  const staffLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'staff@gbs.com', password: 'Staff123!' })
  });
  const staffData = await staffLoginRes.json();
  if (!staffLoginRes.ok) throw new Error(`Staff login failed: ${JSON.stringify(staffData)}`);
  const staffToken = staffData.data.accessToken;
  const staffUser = staffData.data.user;
  console.log(`✅ Staff authenticated: ${staffUser.email} (Tenant ID: ${staffUser.tenantId})`);

  // 3. Verify Status Endpoint
  console.log('\n--- TEST 3: Verify Admissions Workflow Engine Status ---');
  const statusRes = await fetch(`${BASE_URL}/admissions/status`);
  const statusData = await statusRes.json();
  if (statusData.status !== 'success') throw new Error(`Admissions status failed: ${JSON.stringify(statusData)}`);
  console.log(`✅ Admissions service status: ${statusData.data.status} (Total Applications: ${statusData.data.totalApplications})`);
  console.log(`   Pipeline Stages: ${statusData.data.pipelineStages.join(' -> ')}`);

  // 4. Resolve Target Academic Class
  console.log('\n--- TEST 4: Resolve Target Academic Class for Enrollment ---');
  const classesRes = await fetch(`${BASE_URL}/academics/classes`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const classesData = await classesRes.json();
  const targetClass = classesData.data.classes[0];
  if (!targetClass) throw new Error('No academic classes found in database!');
  console.log(`✅ Target Class: ${targetClass.name} (Grade: ${targetClass.gradeLevel}, ID: ${targetClass.id})`);

  // 5. Stage 1: Prospective Family Submits Initial Admission Inquiry
  console.log('\n--- TEST 5: Stage 1 - Create Admission Inquiry (Prospective Student) ---');
  const inquiryRes = await fetch(`${BASE_URL}/admissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      studentFirstName: 'Alexander',
      studentLastName: 'Vanderbilt',
      dateOfBirth: '2010-04-15T00:00:00.000Z',
      targetGradeLevel: targetClass.gradeLevel || 10,
      targetClassId: targetClass.id,
      guardianName: 'Eleanor Vanderbilt',
      guardianEmail: 'eleanor.vanderbilt@horizon-group.org',
      guardianPhone: '+1-555-019-8822',
      guardianRelationship: 'MOTHER',
      previousSchool: 'St. Andrews Preparatory Academy',
      notes: 'Prospective transfer student with high academic honors.'
    })
  });
  const inquiryData = await inquiryRes.json();
  if (!inquiryRes.ok) throw new Error(`Inquiry creation failed: ${JSON.stringify(inquiryData)}`);
  const application = inquiryData.data.application;
  console.log(`✅ Admission Inquiry Created:`);
  console.log(`   Application Number: ${application.applicationNumber}`);
  console.log(`   Student: ${application.studentFirstName} ${application.studentLastName}`);
  console.log(`   Stage: ${application.stage}`);
  console.log(`   Guardian: ${application.guardianName} (${application.guardianEmail})`);

  // 6. Test Analytics & List Filters
  console.log('\n--- TEST 6: Verify Admission Pipeline Query & Analytics ---');
  const analyticsRes = await fetch(`${BASE_URL}/admissions/analytics`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const analyticsData = await analyticsRes.json();
  if (!analyticsRes.ok) throw new Error(`Analytics failed: ${JSON.stringify(analyticsData)}`);
  console.log(`✅ Pipeline Analytics: Total ${analyticsData.data.analytics.totalApplications} applications`);
  console.log(`   Stage Distribution:`, JSON.stringify(analyticsData.data.analytics.stagesCount));

  // 7. Stage 2: Submit Full Application Details
  console.log(`\n--- TEST 7: Stage 2 - Submit Full Application (#${application.id}) ---`);
  const applyRes = await fetch(`${BASE_URL}/admissions/${application.id}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      gender: 'MALE',
      nationality: 'British-American',
      previousSchool: 'St. Andrews Preparatory Academy',
      previousGPA: 3.94,
      address: '742 Evergreen Terrace, Kensington District',
      targetGradeLevel: targetClass.gradeLevel || 10,
      targetClassId: targetClass.id
    })
  });
  const applyData = await applyRes.json();
  if (!applyRes.ok) throw new Error(`Apply failed: ${JSON.stringify(applyData)}`);
  console.log(`✅ Application Details Submitted:`);
  console.log(`   Stage: ${applyData.data.application.stage}`);
  console.log(`   Previous GPA: ${applyData.data.application.previousGPA}`);
  console.log(`   Address: ${applyData.data.application.address}`);

  // 8. Stage 3: Attach & Upload Verification Documents
  console.log(`\n--- TEST 8: Stage 3 - Upload Verification Documents ---`);
  // Document A: Birth Certificate
  const doc1Res = await fetch(`${BASE_URL}/admissions/${application.id}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      documentType: 'BIRTH_CERTIFICATE',
      fileName: 'alexander_vanderbilt_birth_cert.pdf',
      fileSize: 524288
    })
  });
  const doc1Data = await doc1Res.json();
  if (!doc1Res.ok) throw new Error(`Doc 1 upload failed: ${JSON.stringify(doc1Data)}`);
  const doc1 = doc1Data.data.document;
  console.log(`✅ Attached Document 1: ${doc1.documentType} ("${doc1.fileName}") [Status: ${doc1.verificationStatus}]`);

  // Document B: Academic Transcript
  const doc2Res = await fetch(`${BASE_URL}/admissions/${application.id}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      documentType: 'TRANSCRIPT',
      fileName: 'alexander_transcript_grade9.pdf',
      fileSize: 1048576
    })
  });
  const doc2Data = await doc2Res.json();
  if (!doc2Res.ok) throw new Error(`Doc 2 upload failed: ${JSON.stringify(doc2Data)}`);
  const doc2 = doc2Data.data.document;
  console.log(`✅ Attached Document 2: ${doc2.documentType} ("${doc2.fileName}") [Status: ${doc2.verificationStatus}]`);

  // Verify Application Stage is now DOCUMENTS_UPLOADED
  const checkAppRes = await fetch(`${BASE_URL}/admissions/${application.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const checkAppData = await checkAppRes.json();
  console.log(`✅ Current Application Stage: ${checkAppData.data.application.stage} (Docs count: ${checkAppData.data.application.documents.length})`);
  if (checkAppData.data.application.stage !== 'DOCUMENTS_UPLOADED') {
    throw new Error(`Expected stage DOCUMENTS_UPLOADED, got ${checkAppData.data.application.stage}`);
  }

  // 9. Stage 4a: Admissions Officer Verifies Documents
  console.log(`\n--- TEST 9: Stage 4a - Verify Documents by Admissions Officer ---`);
  const verify1Res = await fetch(`${BASE_URL}/admissions/documents/${doc1.id}/verify`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: 'VERIFIED',
      remarks: 'Official stamped civil registry certificate verified against registry.'
    })
  });
  const verify1Data = await verify1Res.json();
  if (!verify1Res.ok) throw new Error(`Verify doc 1 failed: ${JSON.stringify(verify1Data)}`);
  console.log(`✅ Document #${doc1.id} Verified: Status ${verify1Data.data.document.verificationStatus}`);

  const verify2Res = await fetch(`${BASE_URL}/admissions/documents/${doc2.id}/verify`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: 'VERIFIED',
      remarks: 'Official transcript signed by previous headmaster; accredited curriculum.'
    })
  });
  const verify2Data = await verify2Res.json();
  if (!verify2Res.ok) throw new Error(`Verify doc 2 failed: ${JSON.stringify(verify2Data)}`);
  console.log(`✅ Document #${doc2.id} Verified: Status ${verify2Data.data.document.verificationStatus}`);

  // Check that application auto-transitioned to VERIFIED because all docs are verified
  const checkVerifiedRes = await fetch(`${BASE_URL}/admissions/${application.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const checkVerifiedData = await checkVerifiedRes.json();
  console.log(`✅ Application Stage after all docs verified: ${checkVerifiedData.data.application.stage}`);
  if (checkVerifiedData.data.application.stage !== 'VERIFIED') {
    throw new Error(`Expected stage VERIFIED, got ${checkVerifiedData.data.application.stage}`);
  }

  // 10. Stage 4b: Schedule Entrance Interview / Assessment
  console.log(`\n--- TEST 10: Stage 4b - Schedule Entrance Interview ---`);
  const interviewDate = new Date(Date.now() + 48 * 3600000).toISOString();
  const scheduleRes = await fetch(`${BASE_URL}/admissions/${application.id}/schedule-interview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      interviewDate,
      interviewer: 'Dr. Clara Sterling & Admissions Board',
      reviewerNotes: 'Schedule oral proficiency assessment and mathematics placement exam.'
    })
  });
  const scheduleData = await scheduleRes.json();
  if (!scheduleRes.ok) throw new Error(`Schedule interview failed: ${JSON.stringify(scheduleData)}`);
  console.log(`✅ Interview Scheduled:`);
  console.log(`   Stage: ${scheduleData.data.application.stage}`);
  console.log(`   Interview Date: ${scheduleData.data.application.interviewDate}`);
  console.log(`   Interviewer: ${scheduleData.data.application.interviewer}`);

  // 11. Stage 5: Final Admission Approval & Automated Provisioning
  console.log(`\n--- TEST 11: Stage 5 - Final Approval & Automated Student Provisioning ---`);
  const approveRes = await fetch(`${BASE_URL}/admissions/${application.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      targetClassId: targetClass.id,
      reviewerNotes: 'Student unanimously approved by admissions committee with academic scholarship honors.'
    })
  });
  const approveData = await approveRes.json();
  if (!approveRes.ok) throw new Error(`Approve failed: ${JSON.stringify(approveData)}`);
  const approvedResult = approveData.data;
  console.log(`✅ Final Approval Succeeded:`);
  console.log(`   Application Stage: ${approvedResult.application.stage}`);
  console.log(`   Provisioned Student: ${approvedResult.studentUser.firstName} ${approvedResult.studentUser.lastName} (ID: ${approvedResult.studentUser.id})`);
  console.log(`   Student Email: ${approvedResult.studentUser.email}`);
  console.log(`   Role: ${approvedResult.studentUser.role}`);
  console.log(`   Class Enrollment ID: ${approvedResult.enrollment.id} (Class ID: ${approvedResult.enrollment.classId})`);
  console.log(`   Parent User: ${approvedResult.parentUser.email} (ID: ${approvedResult.parentUser.id})`);
  console.log(`   Parent Link: Parent ID ${approvedResult.parentLink.parentId} <-> Student ID ${approvedResult.parentLink.studentId}`);

  // 12. Verify Provisioned Student Can Authenticate via RBAC
  console.log(`\n--- TEST 12: Verify Newly Provisioned Student Login ---`);
  const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: approvedResult.studentUser.email,
      password: 'Student123!'
    })
  });
  const studentLoginData = await studentLoginRes.json();
  if (!studentLoginRes.ok) throw new Error(`Provisioned student login failed: ${JSON.stringify(studentLoginData)}`);
  console.log(`✅ Newly Provisioned Student Authenticated Successfully!`);
  console.log(`   JWT Token Issued: ${studentLoginData.data.accessToken.substring(0, 24)}...`);
  console.log(`   User Role Verified: ${studentLoginData.data.user.role}`);

  // 13. Re-Approval Guard
  console.log(`\n--- TEST 13: Re-Approval Guard (Prevent double-approval) ---`);
  const reApproveRes = await fetch(`${BASE_URL}/admissions/${application.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({})
  });
  const reApproveData = await reApproveRes.json();
  if (reApproveRes.status === 400) {
    console.log(`✅ Correctly Rejected Double-Approval: "${reApproveData.message}"`);
  } else {
    throw new Error(`Expected 400 for double approval, got status ${reApproveRes.status}`);
  }

  // 14. Test Application Rejection Flow
  console.log(`\n--- TEST 14: Rejection Workflow on Prospective Inquiry ---`);
  const inquiry2Res = await fetch(`${BASE_URL}/admissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      studentFirstName: 'Marcus',
      studentLastName: 'Sterling',
      dateOfBirth: '2012-08-20T00:00:00.000Z',
      targetGradeLevel: 8,
      guardianName: 'Arthur Sterling',
      guardianEmail: 'arthur.sterling@example.com',
      guardianPhone: '+1-555-492-1100',
      guardianRelationship: 'FATHER'
    })
  });
  const inquiry2Data = await inquiry2Res.json();
  const app2 = inquiry2Data.data.application;

  const rejectRes = await fetch(`${BASE_URL}/admissions/${app2.id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      reviewerNotes: 'Grade 8 enrollment cap reached for current academic term; waitlist offered.'
    })
  });
  const rejectData = await rejectRes.json();
  if (!rejectRes.ok) throw new Error(`Rejection failed: ${JSON.stringify(rejectData)}`);
  console.log(`✅ Application #${app2.id} Successfully Rejected: Stage ${rejectData.data.application.stage}`);

  // 15. Multi-Tenant Data Isolation Guard
  console.log(`\n--- TEST 15: Multi-Tenant Isolation Guard (Royal Oak Tenant) ---`);
  const royalOakLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'headmaster.royaloak@gbs.edu', password: 'RoyalOak2026!' })
  });
  const royalOakData = await royalOakLoginRes.json();
  if (!royalOakLoginRes.ok) throw new Error(`Royal Oak login failed: ${JSON.stringify(royalOakData)}`);
  const royalOakToken = royalOakData.data.accessToken;

  const royalOakAdmissionsRes = await fetch(`${BASE_URL}/admissions`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const royalOakAdmissions = await royalOakAdmissionsRes.json();
  console.log(`✅ Foreign Tenant (Royal Oak - Tenant ID ${royalOakData.data.user.tenantId}) sees ${royalOakAdmissions.data.applications.length} applications.`);
  if (royalOakAdmissions.data.applications.length !== 0) {
    throw new Error('Tenant isolation breach! Royal Oak saw Tenant 1 admissions applications.');
  }

  // 16. Audit Log Verification in PostgreSQL
  console.log(`\n--- TEST 16: Verify PostgreSQL Audit Trail Persistence ---`);
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          'ADMISSION_INQUIRY_CREATED',
          'ADMISSION_APPLICATION_SUBMITTED',
          'ADMISSION_DOCUMENT_UPLOADED',
          'ADMISSION_DOCUMENT_VERIFIED',
          'ADMISSION_INTERVIEW_SCHEDULED',
          'ADMISSION_APPLICATION_APPROVED',
          'ADMISSION_APPLICATION_REJECTED'
        ]
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 7
  });
  if (auditLogs.length < 7) {
    throw new Error(`Expected at least 7 audit logs for admission actions, found ${auditLogs.length}`);
  }
  auditLogs.forEach((l) => {
    console.log(`✅ [AUDIT LOG #${l.id}] Module: ${l.module} | Action: ${l.action} | Details: ${l.details}`);
  });

  console.log('\n========================================================================');
  console.log('🎉 ALL 16 PHASE 3, PROCEDURE 1 TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================\n');
}

testProcedure9Admissions()
  .catch((err) => {
    console.error('❌ TEST SUITE FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
