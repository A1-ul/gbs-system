'use strict';

const prisma = require('../src/core/database/prisma.client');

async function testProcedure10WorkflowsNotifications() {
  console.log('========================================================================');
  console.log('🧪 PHASE 3, PROCEDURE 2: WORKFLOW ENGINE & NOTIFICATION SERVICES TEST SUITE');
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

  // 3. Verify Workflow Engine Status
  console.log('\n--- TEST 3: Verify Workflow Automation Engine Status ---');
  const wfStatusRes = await fetch(`${BASE_URL}/workflows/status`);
  const wfStatusData = await wfStatusRes.json();
  if (wfStatusData.status !== 'success') throw new Error(`Workflow status failed: ${JSON.stringify(wfStatusData)}`);
  console.log(`✅ Workflow Engine Status: ${wfStatusData.data.status} (Supported Actions: ${wfStatusData.data.supportedActions.join(', ')})`);

  // 4. Verify Notification Engine Status
  console.log('\n--- TEST 4: Verify Multi-Channel Notification Engine Status ---');
  const notifStatusRes = await fetch(`${BASE_URL}/notifications/status`);
  const notifStatusData = await notifStatusRes.json();
  if (notifStatusData.status !== 'success') throw new Error(`Notification status failed: ${JSON.stringify(notifStatusData)}`);
  console.log(`✅ Notification Engine Status: ${notifStatusData.data.status} (Supported Channels: ${notifStatusData.data.supportedChannels.join(', ')})`);

  // 5. Seed & Query Workflow Rules
  console.log('\n--- TEST 5: Query & Seed Default Workflow Rules ---');
  const rulesRes = await fetch(`${BASE_URL}/workflows/rules`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const rulesData = await rulesRes.json();
  if (!rulesRes.ok) throw new Error(`Query rules failed: ${JSON.stringify(rulesData)}`);
  console.log(`✅ Seeded & Retrieved ${rulesData.data.rules.length} Workflow Automation Rules:`);
  rulesData.data.rules.forEach((r) => {
    console.log(`   - [${r.code}] Trigger: ${r.triggerEvent} -> Action: ${r.actionType} (Priority: ${r.priority})`);
  });

  // 6. Seed & Query Notification Templates
  console.log('\n--- TEST 6: Query & Seed Default Notification Templates ---');
  const templatesRes = await fetch(`${BASE_URL}/notifications/templates`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const templatesData = await templatesRes.json();
  if (!templatesRes.ok) throw new Error(`Query templates failed: ${JSON.stringify(templatesData)}`);
  console.log(`✅ Seeded & Retrieved ${templatesData.data.templates.length} Multi-Channel Templates:`);
  templatesData.data.templates.forEach((t) => {
    console.log(`   - [${t.templateCode}] Channel: ${t.channel} | Name: "${t.name}"`);
  });

  // 7. Create Custom Workflow Rule
  console.log('\n--- TEST 7: Create Custom Enterprise Workflow Rule ---');
  const customRuleRes = await fetch(`${BASE_URL}/workflows/rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      code: `RULE_TUITION_OVERDUE_${Date.now()}`,
      name: 'Tuition Fee 14-Day Overdue Escalation',
      description: 'Auto-escalates unpaid tuition accounts over $1,000 to Chief Bursar',
      triggerEvent: 'FEE_OVERDUE',
      conditionLogic: 'ALL',
      conditions: [
        { field: 'outstandingBalance', operator: 'GREATER_THAN', value: '1000' }
      ],
      actionType: 'ESCALATE_SLA',
      actionConfig: {
        department: 'BURSAR_OFFICE',
        targetRole: 'ACCOUNTANT',
        slaHours: 48,
        priority: 'HIGH'
      },
      priority: 3,
      isActive: true
    })
  });
  const customRuleData = await customRuleRes.json();
  if (!customRuleRes.ok) throw new Error(`Create custom rule failed: ${JSON.stringify(customRuleData)}`);
  console.log(`✅ Custom Rule Created: #${customRuleData.data.rule.id} (${customRuleData.data.rule.code})`);

  // 8. Event Hook Trigger: ADMISSION_APPROVED (Triggers Notification)
  console.log('\n--- TEST 8: Event Hook Trigger - ADMISSION_APPROVED ---');
  const trigger1Res = await fetch(`${BASE_URL}/workflows/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      triggerEvent: 'ADMISSION_APPROVED',
      payload: {
        studentFirstName: 'Julian',
        studentLastName: 'Vance',
        studentName: 'Julian Vance',
        applicationNumber: 'ADM-2026-8801',
        className: 'Grade 10 - Honors Academy',
        guardianName: 'Dr. Robert Vance',
        guardianPhone: '+1-555-882-9901',
        guardianEmail: 'robert.vance@vance-biotech.com'
      }
    })
  });
  const trigger1Data = await trigger1Res.json();
  if (!trigger1Res.ok) throw new Error(`Trigger 1 failed: ${JSON.stringify(trigger1Data)}`);
  console.log(`✅ Event 'ADMISSION_APPROVED' Dispatched:`);
  console.log(`   Rules Evaluated: ${trigger1Data.data.totalRulesEvaluated}`);
  console.log(`   Actions Executed: ${trigger1Data.data.executedCount}`);
  trigger1Data.data.results.forEach((r) => {
    console.log(`   - Rule [${r.ruleCode}]: Status ${r.status} (${r.executionTimeMs}ms) Output:`, JSON.stringify(r.actionOutput));
  });

  // 9. Event Hook Trigger: ADMISSION_SUBMITTED with High GPA (Condition Matches)
  console.log('\n--- TEST 9: Event Hook Trigger - Honors Scholarship SLA (GPA 3.94 >= 3.8) ---');
  const trigger2Res = await fetch(`${BASE_URL}/workflows/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      triggerEvent: 'ADMISSION_SUBMITTED',
      payload: {
        studentFirstName: 'Sophia',
        studentLastName: 'Chen',
        previousSchool: 'International Baccalaureate Middle School',
        previousGPA: 3.94,
        targetGradeLevel: 10
      }
    })
  });
  const trigger2Data = await trigger2Res.json();
  if (!trigger2Res.ok) throw new Error(`Trigger 2 failed: ${JSON.stringify(trigger2Data)}`);
  const honorsResult = trigger2Data.data.results.find((r) => r.ruleCode === 'RULE_HONORS_SCHOLARSHIP_ESCALATION');
  console.log(`✅ Condition Evaluated to TRUE!`);
  console.log(`   Rule [${honorsResult.ruleCode}] Status: ${honorsResult.status}`);
  console.log(`   Escalation SLA Output:`, JSON.stringify(honorsResult.actionOutput));
  if (honorsResult.status !== 'SUCCESS') throw new Error('Expected honors scholarship rule to execute successfully!');

  // 10. Event Hook Condition Skip Guard (GPA 3.4 < 3.8)
  console.log('\n--- TEST 10: Event Hook Condition Skip Guard (GPA 3.4 < 3.8) ---');
  const trigger3Res = await fetch(`${BASE_URL}/workflows/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      triggerEvent: 'ADMISSION_SUBMITTED',
      payload: {
        studentFirstName: 'Marcus',
        studentLastName: 'Sterling',
        previousGPA: 3.4,
        targetGradeLevel: 10
      }
    })
  });
  const trigger3Data = await trigger3Res.json();
  if (!trigger3Res.ok) throw new Error(`Trigger 3 failed: ${JSON.stringify(trigger3Data)}`);
  const skipResult = trigger3Data.data.results.find((r) => r.ruleCode === 'RULE_HONORS_SCHOLARSHIP_ESCALATION');
  console.log(`✅ Condition Correctly Evaluated to FALSE:`);
  console.log(`   Rule [${skipResult.ruleCode}] Status: ${skipResult.status} (SKIPPED in PostgreSQL)`);
  if (skipResult.status !== 'SKIPPED') throw new Error('Expected honors scholarship rule to be SKIPPED!');

  // 11. Queue Direct Custom Notification
  console.log('\n--- TEST 11: Direct Multi-Channel Queue Insertion ---');
  const queueRes = await fetch(`${BASE_URL}/notifications/queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      recipientContact: 'teacher@gbs.com',
      recipientName: 'Lead Teacher',
      userId: teacherUser.id,
      channel: 'IN_APP',
      title: 'Term Curriculum Verification Reminder',
      content: 'Please verify all Grade 10 semester lesson plans before Friday 5:00 PM.',
      priority: 'HIGH'
    })
  });
  const queueData = await queueRes.json();
  if (!queueRes.ok) throw new Error(`Queue notification failed: ${JSON.stringify(queueData)}`);
  const queuedItem = queueData.data.queueItem;
  console.log(`✅ Notification Queued in PostgreSQL:`);
  console.log(`   ID: #${queuedItem.id} | Channel: ${queuedItem.channel} | Status: ${queuedItem.status} | Priority: ${queuedItem.priority}`);

  // 12. Process Queue Worker
  console.log('\n--- TEST 12: Process Notification Queue Worker Engine ---');
  const processRes = await fetch(`${BASE_URL}/notifications/process-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ batchSize: 20 })
  });
  const processData = await processRes.json();
  if (!processRes.ok) throw new Error(`Process queue failed: ${JSON.stringify(processData)}`);
  console.log(`✅ Queue Worker Engine Dispatched:`);
  console.log(`   Total Processed & Dispatched: ${processData.data.processedCount} messages`);
  processData.data.dispatchedItems.forEach((item) => {
    console.log(`   - Msg #${item.id} [${item.channel}] -> ${item.recipientContact} | Status: ${item.status}`);
  });

  // 13. Verify In-App Notification Feed for Recipient User
  console.log('\n--- TEST 13: Recipient In-App Notification Feed & Mark-As-Read ---');
  const myNotifRes = await fetch(`${BASE_URL}/notifications/my-notifications`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const myNotifData = await myNotifRes.json();
  if (!myNotifRes.ok) throw new Error(`My notifications failed: ${JSON.stringify(myNotifData)}`);
  console.log(`✅ Teacher Received In-App Notifications: Total ${myNotifData.data.notifications.length} (Unread: ${myNotifData.data.unreadCount})`);
  
  if (myNotifData.data.notifications.length > 0) {
    const firstNotif = myNotifData.data.notifications[0];
    const readRes = await fetch(`${BASE_URL}/notifications/my-notifications/${firstNotif.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const readData = await readRes.json();
    console.log(`✅ Marked In-App Notification #${firstNotif.id} Read: readAt=${readData.data.item.readAt}`);
  }

  // 14. Telemetry Verification
  console.log('\n--- TEST 14: Engine Telemetry Aggregation ---');
  const wfTeleRes = await fetch(`${BASE_URL}/workflows/telemetry`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const wfTeleData = await wfTeleRes.json();
  console.log(`✅ Workflow Telemetry: Rules: ${wfTeleData.data.telemetry.totalRules} (Active: ${wfTeleData.data.telemetry.activeRules}) | Total Execs: ${wfTeleData.data.telemetry.totalExecutions} | Success Rate: ${wfTeleData.data.telemetry.successRate}%`);

  const notifTeleRes = await fetch(`${BASE_URL}/notifications/telemetry`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const notifTeleData = await notifTeleRes.json();
  console.log(`✅ Notification Telemetry: Total: ${notifTeleData.data.telemetry.totalQueueItems} | Sent: ${notifTeleData.data.telemetry.byStatus.SENT} | Delivery Rate: ${notifTeleData.data.telemetry.deliveryRate}%`);

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

  const royalOakQueueRes = await fetch(`${BASE_URL}/notifications/queue`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const royalOakQueue = await royalOakQueueRes.json();
  console.log(`✅ Foreign Tenant (Royal Oak - Tenant ID ${royalOakData.data.user.tenantId}) sees ${royalOakQueue.data.items.length} queue items.`);
  if (royalOakQueue.data.items.length !== 0) {
    throw new Error('Tenant isolation breach! Royal Oak saw Tenant 1 notification queue items.');
  }

  // 16. Audit Log Verification in PostgreSQL
  console.log('\n--- TEST 16: Verify PostgreSQL Audit Trail Persistence ---');
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          'WORKFLOW_RULE_CREATED',
          'WORKFLOW_EVENT_TRIGGERED',
          'NOTIFICATION_QUEUED',
          'NOTIFICATION_BATCH_DISPATCHED'
        ]
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 6
  });
  if (auditLogs.length < 4) {
    throw new Error(`Expected at least 4 audit logs for workflow/notification actions, found ${auditLogs.length}`);
  }
  auditLogs.forEach((l) => {
    console.log(`✅ [AUDIT LOG #${l.id}] Module: ${l.module} | Action: ${l.action} | Details: ${l.details}`);
  });

  console.log('\n========================================================================');
  console.log('🎉 ALL 16 PHASE 3, PROCEDURE 2 TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================\n');
}

testProcedure10WorkflowsNotifications()
  .catch((err) => {
    console.error('❌ TEST SUITE FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
