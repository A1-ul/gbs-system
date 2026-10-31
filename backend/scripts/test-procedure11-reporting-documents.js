'use strict';

const prisma = require('../src/core/database/prisma.client');

async function testProcedure11ReportingDocuments() {
  console.log('========================================================================');
  console.log('🧪 PHASE 3, PROCEDURE 3: REPORT & DOCUMENT GENERATION ENGINE TEST SUITE');
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

  // 2. Authenticate Teacher (Tenant 1)
  console.log('\n--- TEST 2: Authenticate Teacher (teacher@gbs.com) ---');
  const teacherLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teacher@gbs.com', password: 'Teacher123!' })
  });
  const teacherData = await teacherLoginRes.json();
  if (!teacherLoginRes.ok) throw new Error(`Teacher login failed: ${JSON.stringify(teacherData)}`);
  const teacherToken = teacherData.data.accessToken;
  const teacherUser = teacherData.data.user;
  console.log(`✅ Teacher authenticated: ${teacherUser.email} (Tenant ID: ${teacherUser.tenantId})`);

  // 3. Verify Reporting Subsystem Status
  console.log('\n--- TEST 3: Verify Reporting Subsystem Status ---');
  const statusRes = await fetch(`${BASE_URL}/reporting/status`);
  const statusData = await statusRes.json();
  if (statusData.status !== 'success') throw new Error(`Reporting status failed: ${JSON.stringify(statusData)}`);
  console.log(`✅ Reporting Engine Status: ${statusData.data.status} (Supported Types: ${statusData.data.supportedDocumentTypes.join(', ')})`);

  // 4. Seed & Query Report Definitions
  console.log('\n--- TEST 4: Query & Seed Default Report Definitions ---');
  const defsRes = await fetch(`${BASE_URL}/reporting/definitions`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const defsData = await defsRes.json();
  if (!defsRes.ok) throw new Error(`Query definitions failed: ${JSON.stringify(defsData)}`);
  console.log(`✅ Seeded & Retrieved ${defsData.data.definitions.length} Report Definitions:`);
  defsData.data.definitions.forEach((d) => {
    console.log(`   - [${d.code}] Category: ${d.category} | Name: "${d.name}" (Format: ${d.defaultFormat})`);
  });

  // 5. Resolve Target Matriculated Student
  console.log('\n--- TEST 5: Resolve Target Matriculated Student in PostgreSQL ---');
  const student = await prisma.user.findFirst({
    where: { tenantId: 1, role: 'STUDENT' }
  });
  if (!student) throw new Error('No enrolled student found in tenant 1!');
  console.log(`✅ Target Student: ${student.firstName} ${student.lastName} (ID: ${student.id}, Email: ${student.email})`);

  // 6. Generate Official Student Report Card
  console.log('\n--- TEST 6: Generate Official Student Report Card ---');
  const rcRes = await fetch(`${BASE_URL}/reporting/generate/report-card`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      studentId: student.id,
      academicTerm: '2025-2026 Term 1',
      teacherRemarks: 'Outstanding intellectual curiosity, exemplary laboratory problem-solving skills.',
      fileFormat: 'PDF'
    })
  });
  const rcData = await rcRes.json();
  if (!rcRes.ok) throw new Error(`Generate report card failed: ${JSON.stringify(rcData)}`);
  const reportCardDoc = rcData.data.document;
  const rcPayload = rcData.data.reportCard;
  console.log(`✅ Official Report Card Generated in PostgreSQL:`);
  console.log(`   Document Number: ${reportCardDoc.documentNumber}`);
  console.log(`   Student: ${reportCardDoc.recipientName} (${reportCardDoc.className})`);
  console.log(`   Term GPA: ${rcPayload.performance.termGPA} (${rcPayload.performance.academicHonor})`);
  console.log(`   Verification Hash: ${reportCardDoc.verificationHash}`);
  console.log(`   Subject Breakdown: ${rcPayload.subjectBreakdown.length} courses recorded`);

  // 7. Generate Official School Transcript
  console.log('\n--- TEST 7: Generate Official Cumulative Academic Transcript ---');
  const trnRes = await fetch(`${BASE_URL}/reporting/generate/transcript`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      studentId: student.id,
      fileFormat: 'PDF'
    })
  });
  const trnData = await trnRes.json();
  if (!trnRes.ok) throw new Error(`Generate transcript failed: ${JSON.stringify(trnData)}`);
  const transcriptDoc = trnData.data.document;
  const trnPayload = trnData.data.transcript;
  console.log(`✅ Official Academic Transcript Generated:`);
  console.log(`   Document Number: ${transcriptDoc.documentNumber}`);
  console.log(`   Accreditation: ${trnPayload.accreditationBody}`);
  console.log(`   Cumulative GPA: ${trnPayload.cumulativeSummary.cumulativeGPA} (Total Credits: ${trnPayload.cumulativeSummary.totalCreditsCompleted})`);
  console.log(`   Verification Hash: ${transcriptDoc.verificationHash}`);

  // 8. Generate Tuition Fee Payment Receipt
  console.log('\n--- TEST 8: Generate Official Bursar Tuition Fee Receipt ---');
  const feeRes = await fetch(`${BASE_URL}/reporting/generate/fee-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      recipientName: 'Eleanor Vanderbilt',
      studentName: `${student.firstName} ${student.lastName}`,
      amountPaid: 4500.0,
      paymentMethod: 'ELECTRONIC_WIRE',
      invoiceReference: 'INV-2026-9041',
      description: 'Grade 10 Semester 1 Tuition & Technology Levy'
    })
  });
  const feeData = await feeRes.json();
  if (!feeRes.ok) throw new Error(`Generate fee receipt failed: ${JSON.stringify(feeData)}`);
  const feeDoc = feeData.data.document;
  const feePayload = feeData.data.receipt;
  console.log(`✅ Official Fee Receipt Generated:`);
  console.log(`   Receipt Number: ${feeDoc.documentNumber}`);
  console.log(`   Payer: ${feePayload.payer} for student ${feePayload.student}`);
  console.log(`   Total Paid: $${feePayload.totalPaid} ${feePayload.currency} (Status: ${feePayload.status})`);
  console.log(`   Line Items: ${feePayload.lineItems.length} fee categories itemized`);

  // 9. Generate Certificate of Enrollment
  console.log('\n--- TEST 9: Generate Certificate of Enrollment ---');
  const certRes = await fetch(`${BASE_URL}/reporting/generate/enrollment-certificate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      studentName: `${student.firstName} ${student.lastName}`,
      gradeLevel: 10,
      academicYear: '2025-2026'
    })
  });
  const certData = await certRes.json();
  if (!certRes.ok) throw new Error(`Generate certificate failed: ${JSON.stringify(certData)}`);
  const certDoc = certData.data.document;
  console.log(`✅ Certificate of Enrollment Issued:`);
  console.log(`   Certificate Number: ${certDoc.documentNumber}`);
  console.log(`   Certified For: ${certDoc.recipientName} (${certDoc.className})`);
  console.log(`   Verification Hash: ${certDoc.verificationHash}`);

  // 10. Run Report Builder: Academic Performance Analytics
  console.log('\n--- TEST 10: Run Report Builder - Academic Performance ---');
  const report1Res = await fetch(`${BASE_URL}/reporting/analytics/RPT_ACADEMIC_PERFORMANCE`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const report1Data = await report1Res.json();
  if (!report1Res.ok) throw new Error(`Report 1 failed: ${JSON.stringify(report1Data)}`);
  console.log(`✅ Academic Performance Report Compiled:`);
  console.log(`   School Average GPA: ${report1Data.data.report.averageSchoolGPA}`);
  console.log(`   Honor Roll Percentage: ${report1Data.data.report.honorRollPercentage}%`);
  console.log(`   Grade Distributions:`, JSON.stringify(report1Data.data.report.gradeDistributions));

  // 11. Run Report Builder: Fee Collection Ledger
  console.log('\n--- TEST 11: Run Report Builder - Financial Collections Ledger ---');
  const report2Res = await fetch(`${BASE_URL}/reporting/analytics/RPT_FEE_COLLECTION`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const report2Data = await report2Res.json();
  if (!report2Res.ok) throw new Error(`Report 2 failed: ${JSON.stringify(report2Data)}`);
  console.log(`✅ Financial Collections Ledger Compiled:`);
  console.log(`   Total Billed: $${report2Data.data.report.totalBilled} USD`);
  console.log(`   Total Collected: $${report2Data.data.report.totalCollected} USD`);
  console.log(`   Collection Ratio: ${report2Data.data.report.collectionRatio}`);

  // 12. Query Generated Document Registry in PostgreSQL
  console.log('\n--- TEST 12: Query Generated Document Registry ---');
  const docsRes = await fetch(`${BASE_URL}/reporting/documents`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const docsData = await docsRes.json();
  if (!docsRes.ok) throw new Error(`Query documents failed: ${JSON.stringify(docsData)}`);
  console.log(`✅ Official Document Registry contains ${docsData.data.documents.length} verified records in PostgreSQL`);
  if (docsData.data.documents.length < 4) throw new Error('Expected at least 4 generated documents in registry!');

  // 13. Public Digital Document Verification by Hash
  console.log('\n--- TEST 13: Public Cryptographic Document Verification by Hash ---');
  const verifyRes = await fetch(`${BASE_URL}/reporting/verify/${reportCardDoc.verificationHash}`);
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(`Verification failed: ${JSON.stringify(verifyData)}`);
  console.log(`✅ Document Cryptographically Verified against Registry:`);
  console.log(`   Verified: ${verifyData.data.verified}`);
  console.log(`   Doc Number: ${verifyData.data.documentNumber}`);
  console.log(`   Title: ${verifyData.data.title}`);
  console.log(`   Authenticity Note: ${verifyData.data.authenticityNote}`);
  if (!verifyData.data.verified) throw new Error('Legitimate report card verification hash failed!');

  // 14. Tampered Document Hash Verification Guard
  console.log('\n--- TEST 14: Tampered/Bogus Document Hash Verification Guard ---');
  const fakeHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const bogusVerifyRes = await fetch(`${BASE_URL}/reporting/verify/${fakeHash}`);
  const bogusVerifyData = await bogusVerifyRes.json();
  console.log(`✅ Bogus Hash Correctly Rejected: verified=${bogusVerifyData.data.verified} ("${bogusVerifyData.data.message}")`);
  if (bogusVerifyData.data.verified !== false) throw new Error('Bogus hash was incorrectly accepted!');

  // 15. Multi-Tenant Data Isolation Guard
  console.log('\n--- TEST 15: Multi-Tenant Isolation Guard (Royal Oak Tenant) ---');
  const royalOakLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'headmaster.royaloak@gbs.edu', password: 'RoyalOak2026!' })
  });
  const royalOakData = await royalOakLoginRes.json();
  if (!royalOakLoginRes.ok) throw new Error(`Royal Oak login failed: ${JSON.stringify(royalOakData)}`);
  const royalOakToken = royalOakData.data.accessToken;

  const royalOakDocsRes = await fetch(`${BASE_URL}/reporting/documents`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const royalOakDocs = await royalOakDocsRes.json();
  console.log(`✅ Foreign Tenant (Royal Oak - Tenant ID ${royalOakData.data.user.tenantId}) sees ${royalOakDocs.data.documents.length} documents.`);
  if (royalOakDocs.data.documents.length !== 0) {
    throw new Error('Tenant isolation breach! Royal Oak saw Tenant 1 official documents.');
  }

  // 16. Audit Log Verification in PostgreSQL
  console.log('\n--- TEST 16: Verify PostgreSQL Audit Trail Persistence ---');
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          'REPORT_CARD_GENERATED',
          'OFFICIAL_TRANSCRIPT_GENERATED',
          'FEE_RECEIPT_GENERATED',
          'ENROLLMENT_CERTIFICATE_GENERATED'
        ]
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 4
  });
  if (auditLogs.length < 4) {
    throw new Error(`Expected at least 4 audit logs for reporting actions, found ${auditLogs.length}`);
  }
  auditLogs.forEach((l) => {
    console.log(`✅ [AUDIT LOG #${l.id}] Module: ${l.module} | Action: ${l.action} | Details: ${l.details}`);
  });

  console.log('\n========================================================================');
  console.log('🎉 ALL 16 PHASE 3, PROCEDURE 3 TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================\n');
}

testProcedure11ReportingDocuments()
  .catch((err) => {
    console.error('❌ TEST SUITE FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
