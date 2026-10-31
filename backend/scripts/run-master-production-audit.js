'use strict';

const { execSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const testSuites = [
  { id: 'PROC_01_03', name: 'User Registration & Multi-Role Onboarding Engine', script: 'test-registration-onboarding.js' },
  { id: 'PROC_04', name: 'Multi-Tenant Isolation & Provisioning Engine', script: 'test-procedure4-tenancy.js' },
  { id: 'PROC_05', name: 'Academic Curriculum & Core Structure Engine', script: 'test-procedure5-academic.js' },
  { id: 'PROC_06', name: 'Weekly Timetable & Conflict Detection Engine', script: 'test-procedure6-timetable.js' },
  { id: 'PROC_07', name: 'Attendance & Assignment Grading Distribution', script: 'test-procedure7-attendance-assignments.js' },
  { id: 'PROC_08', name: 'Online Classes & Parent Portal Overview', script: 'test-procedure8-online-meetings.js' },
  { id: 'PROC_09', name: 'Admissions Workflow & Automated Student Provisioning', script: 'test-procedure9-admissions.js' },
  { id: 'PROC_10', name: 'Workflow Automation & Multi-Channel Notification Queue', script: 'test-procedure10-workflows-notifications.js' },
  { id: 'PROC_11', name: 'Reporting, Document Generator & Verification Ledger', script: 'test-procedure11-reporting-documents.js' },
  { id: 'PROC_12', name: 'AI Diagnostics Radar & AI Developer Sentinel', script: 'test-procedure12-ai-diagnostics.js' },
  { id: 'PROC_13', name: 'Finance Engine, Student Invoicing & Ledger Reconciliation', script: 'test-procedure13-finance-engine.js' },
  { id: 'PROC_14', name: 'Real-Time Enterprise Communication & Socket Messaging', script: 'test-procedure14-communication.js' },
  { id: 'PROC_15', name: 'Developer Control Center & Real-Time Countdown Engine', script: 'test-procedure15-dev-control.js' },
  { id: 'PROC_16', name: 'Developer Tracking Maps, Facial Liveness & Asset Ingestion', script: 'test-procedure16-tracking-assets.js' },
  { id: 'PROC_ADVANCED_MODULES', name: 'Enterprise Facility, Digital Twin, CCTV & Migration Engine', script: 'test-procedure3-modules.js' },
  { id: 'PROC_FULL_ROLES_AUDIT', name: 'All 7 User Roles End-to-End Enterprise Operational Audit', script: 'test-procedure4-full-roles.js' },
  { id: 'PROC_SHARDING_DR_ENGINE', name: 'Multi-DB Regional Sharding, Read-Replica Sync & Zero-Loss DR Failover', script: 'test-procedure5-sharding-dr.js' }
];

async function runMasterAudit() {
  console.log('================================================================================');
  console.log('   GBS ENTERPRISE INTERNATIONAL SCHOOL MANAGEMENT SYSTEM                        ');
  console.log('   FULL END-TO-END PRODUCTION READINESS AUDIT & FINAL SYSTEM VERIFICATION       ');
  console.log('================================================================================\n');

  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Database Engine: PostgreSQL (Port 5432)`);
  console.log(`Backend Server: Node.js / Express (Port 5001)\n`);

  let totalSuites = testSuites.length;
  let suitesPassed = 0;
  let suitesFailed = 0;
  const auditResults = [];

  const resetState = async () => {
    await prisma.tenant.updateMany({ data: { status: 'ACTIVE', isActive: true, isDeleted: false } });
    await prisma.user.updateMany({ data: { isLocked: false, isActive: true, isDeleted: false, failedLoginAttempts: 0 } });
    await prisma.systemLock.updateMany({ data: { isLocked: false } });
  };

  await resetState();

  for (let i = 0; i < testSuites.length; i++) {
    await resetState();
    const suite = testSuites[i];
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[${i + 1}/${totalSuites}] RUNNING SUITE: ${suite.name} (${suite.script})`);
    console.log(`--------------------------------------------------------------------------------`);

    const scriptPath = path.resolve(__dirname, suite.script);
    const startTime = Date.now();
    try {
      const output = execSync(`node "${scriptPath}"`, {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      const durationMs = Date.now() - startTime;
      console.log(`✓ SUITE PASSED in ${durationMs}ms`);
      suitesPassed++;
      auditResults.push({ id: suite.id, name: suite.name, status: 'PASSED', durationMs });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      console.error(`✗ SUITE FAILED in ${durationMs}ms`);
      if (err.stdout) console.log(err.stdout);
      if (err.stderr) console.error(err.stderr);
      suitesFailed++;
      auditResults.push({ id: suite.id, name: suite.name, status: 'FAILED', durationMs, error: err.message });
    }
  }

  // Database Deep Audit
  console.log('\n================================================================================');
  console.log('   POSTGRESQL REPOSITORY DEEP AUDIT                                             ');
  console.log('================================================================================');

  // Pre-audit: ensure all test users and tenants are in active, unlocked state
  await prisma.tenant.updateMany({ data: { status: 'ACTIVE', isActive: true, isDeleted: false } });
  await prisma.user.updateMany({ data: { isLocked: false, isActive: true, isDeleted: false, failedLoginAttempts: 0 } });
  await prisma.systemLock.updateMany({ data: { isLocked: false } });

  const tenantCount = await prisma.tenant.count({ where: { isDeleted: false } });
  const userCount = await prisma.user.count({ where: { isDeleted: false } });
  const classCount = await prisma.class.count();
  const subjectCount = await prisma.subject.count();
  const assignmentCount = await prisma.assignment.count();
  const attendanceCount = await prisma.attendanceRecord.count();
  const meetingCount = await prisma.onlineMeeting.count();
  const applicationCount = await prisma.admissionApplication.count();
  const invoiceCount = await prisma.studentInvoice.count();
  const channelCount = await prisma.chatChannel.count();
  const messageCount = await prisma.chatMessage.count();
  const backupCount = await prisma.systemBackup.count();
  const auditLogCount = await prisma.auditLog.count();

  console.log(`• Active Registered Tenants: ${tenantCount}`);
  console.log(`• Active Registered Users:   ${userCount}`);
  console.log(`• Academic Classes:          ${classCount}`);
  console.log(`• Academic Subjects:         ${subjectCount}`);
  console.log(`• Published Assignments:     ${assignmentCount}`);
  console.log(`• Attendance Session Records: ${attendanceCount}`);
  console.log(`• Scheduled Online Meetings: ${meetingCount}`);
  console.log(`• Admission Applications:    ${applicationCount}`);
  console.log(`• Finance Invoices:          ${invoiceCount}`);
  console.log(`• Communication Channels:    ${channelCount}`);
  console.log(`• Recorded Messages:         ${messageCount}`);
  console.log(`• Encrypted Backups:         ${backupCount}`);
  console.log(`• Audit Trail Ledger Logs:   ${auditLogCount}`);

  // Summary
  console.log('\n================================================================================');
  console.log(`   MASTER AUDIT SUMMARY: ${suitesPassed}/${totalSuites} TEST SUITES PASSED      `);
  console.log('================================================================================\n');

  if (suitesFailed === 0) {
    console.log('>>> SYSTEM STATUS: 100% PRODUCTION-READY & OPERATIONAL <<<');
    process.exit(0);
  } else {
    console.error(`>>> SYSTEM STATUS: ${suitesFailed} SUITES FAILED <<<`);
    process.exit(1);
  }
}

runMasterAudit().catch((err) => {
  console.error('Master Audit Execution Fatal Error:', err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
