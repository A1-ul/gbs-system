'use strict';

const prisma = require('../src/core/database/prisma.client');

async function testProcedure12AIDiagnostics() {
  console.log('========================================================================');
  console.log('🧪 PHASE 3, PROCEDURE 4: AI RECOMMENDATIONS & LEARNING DIAGNOSTICS');
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
  const adminToken = adminData.data.accessToken || adminData.data.token;
  console.log(`✅ Admin authenticated: ${adminData.data.user.email} (Tenant ID: ${adminData.data.user.tenantId})`);

  // 2. Authenticate Teacher (Tenant 1)
  console.log('\n--- TEST 2: Authenticate Teacher (teacher@gbs.com) ---');
  const teacherLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teacher@gbs.com', password: 'Teacher123!' })
  });
  const teacherData = await teacherLoginRes.json();
  if (!teacherLoginRes.ok) throw new Error(`Teacher login failed: ${JSON.stringify(teacherData)}`);
  const teacherToken = teacherData.data.accessToken || teacherData.data.token;
  console.log(`✅ Teacher authenticated: ${teacherData.data.user.email} (Tenant ID: ${teacherData.data.user.tenantId})`);

  // 3. Verify AI Engine Operational Status & Capability Matrix
  console.log('\n--- TEST 3: Verify AI Engine Operational Status ---');
  const statusRes = await fetch(`${BASE_URL}/ai/status`);
  const statusData = await statusRes.json();
  if (!statusRes.ok || statusData.data?.status !== 'OPERATIONAL') {
    throw new Error(`AI status check failed: ${JSON.stringify(statusData)}`);
  }
  console.log(`✅ AI Engine Status: ${statusData.data.status}`);
  console.log(`   Capabilities: ${statusData.data.capabilities.join(', ')}`);
  console.log(`   Risk Levels: ${statusData.data.supportedRiskCategories.join(', ')}`);

  // 4. Resolve Target Student in PostgreSQL
  console.log('\n--- TEST 4: Resolve Target Student in PostgreSQL ---');
  const student = await prisma.user.findFirst({
    where: { tenantId: 1, role: 'STUDENT' }
  });
  if (!student) throw new Error('No enrolled student found in tenant 1!');
  console.log(`✅ Target Student: ${student.firstName} ${student.lastName} (ID: ${student.id})`);

  // 5. Execute Student Academic Diagnostic Evaluation (Blueprint Box 9)
  console.log('\n--- TEST 5: Student Academic Diagnostic Evaluation ---');
  const diagRes = await fetch(`${BASE_URL}/ai/diagnostics/student/${student.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    }
  });
  const diagData = await diagRes.json();
  if (!diagRes.ok) throw new Error(`Diagnostic failed: ${JSON.stringify(diagData)}`);
  const report = diagData.data;
  console.log(`✅ Diagnostic Report ID: ${report.id} generated for Student: ${report.studentName}`);
  console.log(`   Overall GPA: ${report.overallGpa.toFixed(2)} | Predicted Next GPA: ${report.predictedNextGpa?.toFixed(2) || 'N/A'}`);
  console.log(`   Attendance Rate: ${report.attendanceRate}% | Submission Rate: ${report.submissionRate}%`);
  console.log(`   Academic Risk Category: ${report.riskCategory} (Weighted Score: ${report.riskScore}/100)`);
  console.log(`   Exam Pass Probability: ${report.examPassProbability}%`);
  console.log(`   Strengths: ${report.strengthsList?.join(', ') || 'Consistent Performance'}`);

  // 6. Cohort Diagnostic Aggregation
  console.log('\n--- TEST 6: Cohort-Wide Diagnostic Aggregation ---');
  const cohortRes = await fetch(`${BASE_URL}/ai/diagnostics/cohort`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const cohortData = await cohortRes.json();
  if (!cohortRes.ok) throw new Error(`Cohort diagnostic failed: ${JSON.stringify(cohortData)}`);
  console.log(`✅ Cohort Analysis Complete (${cohortData.data.totalStudents} Students Evaluated):`);
  console.log(`   Average GPA: ${cohortData.data.averageGpa} | Average Attendance: ${cohortData.data.averageAttendance}%`);
  console.log(`   Risk Breakdown: Honors: ${cohortData.data.riskDistribution.HONORS_CANDIDATE}, On Track: ${cohortData.data.riskDistribution.ON_TRACK}, Moderate: ${cohortData.data.riskDistribution.MODERATE_RISK}, Critical: ${cohortData.data.riskDistribution.CRITICAL_RISK}`);

  // 7. Generate Adaptive AI Study Plan (Blueprint Box 9)
  console.log('\n--- TEST 7: Generate Adaptive AI Study Plan ---');
  const planRes = await fetch(`${BASE_URL}/ai/study-plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      studentId: student.id,
      planTitle: 'AP STEM Mastery & Differential Calculus Acceleration',
      academicGoal: 'Attain Grade A+ and reinforce kinematics problem solving',
      weeklyTargetHours: 12,
      focusSubjects: ['Mathematics', 'Physics', 'Chemistry']
    })
  });
  const planData = await planRes.json();
  if (!planRes.ok) throw new Error(`Study plan creation failed: ${JSON.stringify(planData)}`);
  const studyPlan = planData.data;
  console.log(`✅ Adaptive Study Plan Generated: '${studyPlan.planTitle}' (ID: ${studyPlan.id})`);
  console.log(`   Target Hours: ${studyPlan.weeklyTargetHours} hrs/week`);
  console.log(`   Daily Study Blocks: ${studyPlan.parsedSchedule.length} days scheduled`);
  console.log(`   Recommended Resources: ${studyPlan.parsedResources.length} learning modules`);

  // 8. Query Student Study Plans
  console.log('\n--- TEST 8: Query Student Study Plans ---');
  const getPlansRes = await fetch(`${BASE_URL}/ai/study-plans/${student.id}`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const getPlansData = await getPlansRes.json();
  if (!getPlansRes.ok || getPlansData.data.length === 0) {
    throw new Error(`Failed to retrieve study plans: ${JSON.stringify(getPlansData)}`);
  }
  console.log(`✅ Retrieved ${getPlansData.data.length} study plans for Student ID ${student.id}`);

  // 9. Create Early Learning Intervention Alert (Blueprint Box 9)
  console.log('\n--- TEST 9: Create Early Learning Intervention Alert ---');
  const intervRes = await fetch(`${BASE_URL}/ai/interventions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      studentId: student.id,
      title: 'Academic Support Alert: Calculus Differentiation Drill',
      triggerReason: 'GRADE_DROP',
      severity: 'HIGH',
      actionStrategy: '1-on-1 Remedial Tutoring Session',
      actionNotes: 'Early detection flagged learning gap in quadratic kinematics. Schedule review before midterms.'
    })
  });
  const intervData = await intervRes.json();
  if (!intervRes.ok) throw new Error(`Intervention creation failed: ${JSON.stringify(intervData)}`);
  const intervention = intervData.data;
  console.log(`✅ Intervention Alert Created: '${intervention.title}' (ID: ${intervention.id})`);
  console.log(`   Severity: ${intervention.severity} | Strategy: ${intervention.actionStrategy}`);

  // 10. Query Interventions with Filtering
  console.log('\n--- TEST 10: Query Interventions with Filter ---');
  const getIntervRes = await fetch(`${BASE_URL}/ai/interventions?status=OPEN`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const getIntervData = await getIntervRes.json();
  if (!getIntervRes.ok || getIntervData.data.length === 0) {
    throw new Error(`Failed to query interventions: ${JSON.stringify(getIntervData)}`);
  }
  console.log(`✅ Retrieved ${getIntervData.data.length} active OPEN interventions in Tenant 1`);

  // 11. Transition Intervention Lifecycle (OPEN -> RESOLVED)
  console.log('\n--- TEST 11: Transition Intervention Status (OPEN -> RESOLVED) ---');
  const updateIntervRes = await fetch(`${BASE_URL}/ai/interventions/${intervention.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      status: 'RESOLVED',
      actionNotes: 'Student attended 2 remedial tutoring sessions and achieved 95% on follow-up quiz.'
    })
  });
  const updateIntervData = await updateIntervRes.json();
  if (!updateIntervRes.ok || updateIntervData.data?.status !== 'RESOLVED') {
    throw new Error(`Failed to update intervention: ${JSON.stringify(updateIntervData)}`);
  }
  console.log(`✅ Intervention ${intervention.id} status transitioned to: RESOLVED (Resolved At: ${updateIntervData.data.resolvedAt})`);

  // 12. AI Developer Assistant: Full Architecture & Health Scan (Blueprint Box 10)
  console.log('\n--- TEST 12: AI Developer Assistant: Full Architecture Scan (Box 10) ---');
  const devScanRes = await fetch(`${BASE_URL}/ai/developer/diagnostics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ scanType: 'FULL_ARCHITECTURE' })
  });
  const devScanData = await devScanRes.json();
  if (!devScanRes.ok) throw new Error(`Developer scan failed: ${JSON.stringify(devScanData)}`);
  const scan = devScanData.data;
  console.log(`✅ System Diagnostics Scan Completed (Scan ID: ${scan.id})`);
  console.log(`   Health Score: ${scan.healthScore}/100 | Status: ${scan.status}`);
  console.log(`   PostgreSQL Tables Verified: ${scan.parsedData.database.tableCount}`);
  console.log(`   Multi-Tenant Guard Status: ${scan.parsedData.database.isolationGuard}`);
  console.log(`   Developer Recommendations (${scan.recommendationsList.length}):`);
  scan.recommendationsList.forEach((rec) => console.log(`     - ${rec}`));

  // 13. Query System Diagnostics History
  console.log('\n--- TEST 13: Query System Diagnostics History ---');
  const histRes = await fetch(`${BASE_URL}/ai/developer/diagnostics?limit=5`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const histData = await histRes.json();
  if (!histRes.ok || histData.data.length === 0) {
    throw new Error(`Failed to query diagnostics history: ${JSON.stringify(histData)}`);
  }
  console.log(`✅ Retrieved ${histData.data.length} architectural scans from audit history`);

  // 14. AI Telemetry & Risk Aggregation
  console.log('\n--- TEST 14: Query AI Telemetry Aggregation ---');
  const telRes = await fetch(`${BASE_URL}/ai/telemetry`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const telData = await telRes.json();
  if (!telRes.ok) throw new Error(`Telemetry failed: ${JSON.stringify(telData)}`);
  const tel = telData.data;
  console.log(`✅ Telemetry Summary:`);
  console.log(`   Total Reports: ${tel.totalReports}`);
  console.log(`   Active Study Plans: ${tel.studyPlans.active} | Total Interventions: ${tel.interventions.total}`);
  console.log(`   System Health Score: ${tel.systemHealth.score}/100 (Status: ${tel.systemHealth.status})`);

  // 15. Multi-Tenant Data Isolation Guard (Royal Oak Tenant)
  console.log('\n--- TEST 15: Multi-Tenant Data Isolation Guard (Royal Oak) ---');
  const royalOakLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'headmaster.royaloak@gbs.edu', password: 'RoyalOak2026!' })
  });
  const royalOakData = await royalOakLoginRes.json();
  if (!royalOakLoginRes.ok) throw new Error(`Royal Oak login failed: ${JSON.stringify(royalOakData)}`);
  const royalOakToken = royalOakData.data.accessToken || royalOakData.data.token;

  const royalOakPlansRes = await fetch(`${BASE_URL}/ai/study-plans`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const royalOakPlans = await royalOakPlansRes.json();

  const royalOakIntervRes = await fetch(`${BASE_URL}/ai/interventions`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const royalOakInterv = await royalOakIntervRes.json();

  console.log(`✅ Foreign Tenant (Royal Oak - Tenant ID ${royalOakData.data.user.tenantId}) sees:`);
  console.log(`   Study Plans: ${royalOakPlans.data.length} | Interventions: ${royalOakInterv.data.length}`);
  if (royalOakPlans.data.length !== 0 || royalOakInterv.data.length !== 0) {
    throw new Error('Tenant isolation breach! Royal Oak saw Tenant 1 AI records.');
  }

  // 16. Verify PostgreSQL Audit Trail Persistence
  console.log('\n--- TEST 16: Verify PostgreSQL Audit Trail Persistence ---');
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          'AI_STUDENT_DIAGNOSTIC_COMPLETED',
          'AI_STUDY_PLAN_GENERATED',
          'AI_INTERVENTION_CREATED',
          'AI_INTERVENTION_UPDATED',
          'AI_DEVELOPER_SYSTEM_DIAGNOSTIC_RUN'
        ]
      }
    },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log(`✅ Found ${auditLogs.length} immutable audit logs for AI operations:`);
  auditLogs.forEach((log) => {
    console.log(`   - [${log.action}] Resource: ${log.resource} | ${log.details}`);
  });
  if (auditLogs.length < 5) throw new Error('Expected at least 5 audit logs for AI actions!');

  console.log('\n========================================================================');
  console.log('🎉 ALL 16 AI RECOMMENDATIONS & LEARNING DIAGNOSTICS TESTS PASSED (100%)');
  console.log('========================================================================\n');
}

testProcedure12AIDiagnostics()
  .catch((err) => {
    console.error('\n❌ TEST FAILURE:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
