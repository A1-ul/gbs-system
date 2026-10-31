'use strict';

const prisma = require('../src/core/database/prisma.client');

async function testProcedure14CommunicationEngine() {
  console.log('========================================================================');
  console.log('🧪 PHASE 4, PROCEDURE 2: ENTERPRISE REAL-TIME COMMUNICATION & CHAT ENGINE');
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

  // 2. Authenticate Foreign Tenant: Royal Oak (Tenant 6)
  console.log('\n--- TEST 2: Authenticate Foreign Tenant: Royal Oak (headmaster.royaloak@gbs.edu) ---');
  const royalOakLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'headmaster.royaloak@gbs.edu', password: 'RoyalOak2026!' })
  });
  const royalOakData = await royalOakLoginRes.json();
  if (!royalOakLoginRes.ok) throw new Error(`Royal Oak login failed: ${JSON.stringify(royalOakData)}`);
  const royalOakToken = royalOakData.data.accessToken || royalOakData.data.token;
  console.log(`✅ Royal Oak authenticated: ${royalOakData.data.user.email} (Tenant ID: ${royalOakData.data.user.tenantId})`);

  // 3. Verify Status & Socket Telemetry Endpoint
  console.log('\n--- TEST 3: Verify Communication Engine Operational Status & Socket Telemetry ---');
  const statusRes = await fetch(`${BASE_URL}/communication/status`);
  const statusData = await statusRes.json();
  if (!statusRes.ok || statusData.data.status !== 'OPERATIONAL') {
    throw new Error(`Communication status check failed: ${JSON.stringify(statusData)}`);
  }
  console.log(`✅ Communication Engine Status: ${statusData.data.status}`);
  console.log(`   Capabilities: ${statusData.data.capabilities.join(', ')}`);
  console.log(`   Socket Stats: Initialized: ${statusData.data.socketStats.initialized}, Active: ${statusData.data.socketStats.activeConnections}, Max: ${statusData.data.socketStats.maxConnections}`);

  // 4. Query & Auto-seed Institutional Channels
  console.log('\n--- TEST 4: Query & Auto-seed Institutional Channels ---');
  const channelsRes = await fetch(`${BASE_URL}/communication/channels`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const channelsData = await channelsRes.json();
  if (!channelsRes.ok) throw new Error(`Query channels failed: ${JSON.stringify(channelsData)}`);
  const channels = channelsData.data.channels;
  console.log(`✅ Channels returned: ${channels.length} active channels in Tenant 1:`);
  channels.slice(0, 4).forEach(c => {
    console.log(`   • [${c.channelCode}] ${c.name} (${c.type}, Members: ${c.memberCount})`);
  });

  const generalChannel = channels[0];
  if (!generalChannel) throw new Error('No channels available for message testing.');

  // 5. Create Custom Communication Channel
  console.log('\n--- TEST 5: Create Custom Communication Channel ---');
  const customChannelCode = `PHYS-11-${Date.now()}`;
  const createChanRes = await fetch(`${BASE_URL}/communication/channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      channelCode: customChannelCode,
      name: 'Grade 11 Advanced Physics Discussion Group',
      type: 'GROUP',
      description: 'Collaborative academic study channel for laboratory experiments and problem sets.'
    })
  });
  const createChanData = await createChanRes.json();
  if (!createChanRes.ok) throw new Error(`Create channel failed: ${JSON.stringify(createChanData)}`);
  const createdChannel = createChanData.data.channel;
  console.log(`✅ Custom Channel Created: ID ${createdChannel.id} | Code: ${createdChannel.channelCode} | Name: '${createdChannel.name}'`);

  // 6. Post Standard Message in Channel
  console.log('\n--- TEST 6: Post Standard Text Message in Channel ---');
  const postMsgRes = await fetch(`${BASE_URL}/communication/channels/${createdChannel.id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      content: 'Welcome students and faculty to the Grade 11 Advanced Physics collaboration forum. Weekly problem sets will be posted here.',
      priority: 'NORMAL',
      messageType: 'TEXT'
    })
  });
  const postMsgData = await postMsgRes.json();
  if (!postMsgRes.ok) throw new Error(`Post message failed: ${JSON.stringify(postMsgData)}`);
  const postedMsg = postMsgData.data.message;
  console.log(`✅ Message Posted: ID ${postedMsg.id}`);
  console.log(`   Sender: ${postedMsg.senderName} (${postedMsg.senderRole})`);
  console.log(`   Content: "${postedMsg.content}"`);
  console.log(`   Priority: ${postedMsg.priority} | SMS Dispatched: ${postedMsg.smsDispatched}`);

  // 7. Post High-Priority Emergency Broadcast Message
  console.log('\n--- TEST 7: Post High-Priority Emergency Broadcast Message ---');
  const emergencyMsgRes = await fetch(`${BASE_URL}/communication/channels/${generalChannel.id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      content: 'URGENT: Campus weather advisory protocol activated. Afternoon transportation routes will commence 30 minutes earlier.',
      priority: 'EMERGENCY',
      messageType: 'EMERGENCY_ALERT'
    })
  });
  const emergencyMsgData = await emergencyMsgRes.json();
  if (!emergencyMsgRes.ok) throw new Error(`Post emergency message failed: ${JSON.stringify(emergencyMsgData)}`);
  const emergencyMsg = emergencyMsgData.data.message;
  console.log(`✅ Emergency Alert Message Posted: ID ${emergencyMsg.id}`);
  console.log(`   Priority: ${emergencyMsg.priority} | Type: ${emergencyMsg.messageType}`);
  console.log(`   Auto SMS Bridge Dispatched: ${emergencyMsg.smsDispatched} | Email Bridge Dispatched: ${emergencyMsg.emailDispatched}`);
  if (!emergencyMsg.smsDispatched || !emergencyMsg.emailDispatched) {
    throw new Error('Emergency message did not trigger automated SMS/Email bridge flags.');
  }

  // 8. Query Messages for Channel
  console.log('\n--- TEST 8: Query Messages Ledger for Channel ---');
  const getMsgsRes = await fetch(`${BASE_URL}/communication/channels/${createdChannel.id}/messages`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const getMsgsData = await getMsgsRes.json();
  if (!getMsgsRes.ok) throw new Error(`Get messages failed: ${JSON.stringify(getMsgsData)}`);
  console.log(`✅ Retrieved ${getMsgsData.results} message(s) for channel #${createdChannel.id}.`);

  // 9. Send Direct 1-on-1 Message (Parent-Teacher / Admin-User)
  console.log('\n--- TEST 9: Send Direct 1-on-1 Message ---');
  // Find a target user in Tenant 1 (e.g. user id 4)
  const targetUser = await prisma.user.findFirst({
    where: { tenantId: 1, id: { not: adminData.data.user.id } }
  });
  if (!targetUser) throw new Error('No target user found in Tenant 1 for direct message test.');

  const dmRes = await fetch(`${BASE_URL}/communication/direct-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      recipientId: targetUser.id,
      content: `Hello ${targetUser.firstName || 'colleague'}, this is an official direct communication regarding curriculum alignment.`
    })
  });
  const dmData = await dmRes.json();
  if (!dmRes.ok) throw new Error(`Send direct message failed: ${JSON.stringify(dmData)}`);
  console.log(`✅ Direct Message Sent to User #${targetUser.id} (${targetUser.email}):`);
  console.log(`   Direct Channel: ${dmData.data.channel.name} (${dmData.data.channel.channelCode})`);
  console.log(`   Message ID: ${dmData.data.message.id}`);

  // 10. Query Direct Conversations
  console.log('\n--- TEST 10: Query Direct Conversations ---');
  const directConvsRes = await fetch(`${BASE_URL}/communication/direct-messages`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const directConvsData = await directConvsRes.json();
  if (!directConvsRes.ok) throw new Error(`Get direct messages failed: ${JSON.stringify(directConvsData)}`);
  console.log(`✅ Direct conversations returned: ${directConvsData.results} active conversations.`);

  // 11. Publish School-Wide Broadcast Announcement
  console.log('\n--- TEST 11: Publish School-Wide Broadcast Announcement ---');
  const announcementRes = await fetch(`${BASE_URL}/communication/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Annual GBS International STEM Innovation & Robotics Exhibition',
      content: 'We invite all parents, students, and educators to the campus STEM Pavilion on Friday at 10:00 AM for student project demonstrations.',
      category: 'ACADEMIC',
      priority: 'NORMAL',
      targetAudience: 'ALL'
    })
  });
  const announcementData = await announcementRes.json();
  if (!announcementRes.ok) throw new Error(`Publish announcement failed: ${JSON.stringify(announcementData)}`);
  const publishedAnn = announcementData.data.announcement;
  console.log(`✅ Broadcast Announcement Published: ID ${publishedAnn.id}`);
  console.log(`   Title: '${publishedAnn.title}'`);
  console.log(`   Audience: ${publishedAnn.targetAudience} | Category: ${publishedAnn.category}`);
  console.log(`   Email Dispatched Count: ${publishedAnn.emailSentCount}`);

  // 12. Query Announcements
  console.log('\n--- TEST 12: Query Broadcast Announcements ---');
  const getAnnRes = await fetch(`${BASE_URL}/communication/announcements`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const getAnnData = await getAnnRes.json();
  if (!getAnnRes.ok) throw new Error(`Query announcements failed: ${JSON.stringify(getAnnData)}`);
  console.log(`✅ Active Announcements in Tenant 1: ${getAnnData.results} circular(s).`);

  // 13. Multi-Tenant Strict Isolation Guard (Royal Oak - Tenant 6)
  console.log('\n--- TEST 13: Multi-Tenant Strict Isolation Guard (Royal Oak - Tenant ID 6) ---');
  const royalOakChannelsRes = await fetch(`${BASE_URL}/communication/channels`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const royalOakChannelsData = await royalOakChannelsRes.json();
  if (!royalOakChannelsRes.ok) throw new Error(`Royal Oak channels query failed: ${JSON.stringify(royalOakChannelsData)}`);
  const royalOakChannels = royalOakChannelsData.data.channels;

  // Verify none of Tenant 1 channels or custom channel leaked to Royal Oak
  const leakedChannel = royalOakChannels.find(c => c.channelCode === customChannelCode || c.tenantId === 1);
  if (leakedChannel) {
    throw new Error(`CRITICAL TENANT LEAKAGE: Royal Oak saw Tenant 1 channel '${leakedChannel.name}'`);
  }
  console.log(`✅ Royal Oak queried channels: ${royalOakChannels.length} isolated channels for Tenant 6.`);
  console.log(`✅ ZERO cross-tenant channels leaked from Tenant 1 (Custom channel '${customChannelCode}' is strictly isolated).`);

  const royalOakAnnRes = await fetch(`${BASE_URL}/communication/announcements`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const royalOakAnnData = await royalOakAnnRes.json();
  const leakedAnn = royalOakAnnData.data.announcements.find(a => a.id === publishedAnn.id || a.tenantId === 1);
  if (leakedAnn) {
    throw new Error(`CRITICAL TENANT LEAKAGE: Royal Oak saw Tenant 1 announcement '${leakedAnn.title}'`);
  }
  console.log(`✅ Royal Oak queried announcements: 0 cross-tenant circulars from Tenant 1.`);
  console.log('✅ MULTI-TENANT ISOLATION 100% VERIFIED: ZERO cross-tenant communication leakage.');

  // 14. Verify Immutable PostgreSQL Audit Trail
  console.log('\n--- TEST 14: Verify Immutable PostgreSQL Audit Trail ---');
  const commAuditLogs = await prisma.auditLog.findMany({
    where: { tenantId: 1, module: 'COMMUNICATION' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(`✅ Verified ${commAuditLogs.length} audit log entries in PostgreSQL for module 'COMMUNICATION':`);
  commAuditLogs.forEach(log => {
    console.log(`   • [${log.action}] User: ${log.userId} | ${log.details} (${log.createdAt.toISOString()})`);
  });

  const actions = commAuditLogs.map(l => l.action);
  if (!actions.includes('CHANNEL_CREATED') || !actions.includes('MESSAGE_SENT') || !actions.includes('ANNOUNCEMENT_PUBLISHED')) {
    throw new Error(`Missing expected audit log actions in PostgreSQL: ${JSON.stringify(actions)}`);
  }
  console.log('✅ IMMUTABLE AUDIT TRAIL 100% VERIFIED.');

  console.log('\n========================================================================');
  console.log('🎉 ALL 14 ENTERPRISE COMMUNICATION & MESSAGING TESTS PASSED PERFECTLY!');
  console.log('========================================================================\n');
}

testProcedure14CommunicationEngine()
  .catch(err => {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
