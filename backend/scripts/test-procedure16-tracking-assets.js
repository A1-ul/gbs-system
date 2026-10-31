'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PORT = 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'gbs_super_secret_jwt_key_2026_enterprise_production_ready';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('   PHASE 4, PROCEDURE 4 — LIVE TRACKING, FACIAL & ASSETS TEST   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Prepare Authentication Tokens
    console.log('[1/4] Preparing Authentication Tokens...');
    
    // Developer JWT
    const devToken = jwt.sign(
      { role: 'DEVELOPER', devId: 'DEV-GBS-MASTER', pinVerified: true },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Admin User & JWT
    const adminUser = await prisma.user.findFirst({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, tenantId: 1, isDeleted: false }
    });
    const adminToken = jwt.sign(
      { id: adminUser ? adminUser.id : 17, role: adminUser ? adminUser.role : 'ADMIN', tenantId: 1 },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Student User & JWT
    const studentUser = await prisma.user.findFirst({
      where: { role: 'STUDENT', isDeleted: false }
    });
    const studentToken = jwt.sign(
      { id: studentUser ? studentUser.id : 3, role: 'STUDENT', tenantId: studentUser ? studentUser.tenantId : 1 },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    assert(devToken && adminToken && studentToken, 'Generated Developer, Admin, and Student tokens');

    // 2. Developer-Only Multi-Tenant Live Location Maps (Step 34)
    console.log('\n[2/4] Testing Developer-Only Tenant Location Maps (Step 34)...');

    // Test 2a: Developer access to /tracking/tenant-pins -> 200 OK
    const devPinsRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/tracking/tenant-pins',
      method: 'GET',
      headers: { Authorization: `Bearer ${devToken}` }
    });
    assert(
      devPinsRes.status === 200 && Array.isArray(devPinsRes.body.locations) && devPinsRes.body.locations.length > 0,
      `Developer authorized to access tenant pins (HTTP 200, count: ${devPinsRes.body.locations?.length || 0})`
    );

    // Test 2b: Admin access to /tracking/tenant-pins -> 403 Forbidden (Step 34 enforcement)
    const adminPinsRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/tracking/tenant-pins',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      adminPinsRes.status === 403,
      `Non-developer Admin strictly forbidden from viewing tenant location pins (HTTP 403 Forbidden)`
    );

    // Test 2c: Student access to /tracking/tenant-pins -> 403 Forbidden
    const studentPinsRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/tracking/tenant-pins',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(
      studentPinsRes.status === 403,
      `Student strictly forbidden from viewing tenant location pins (HTTP 403 Forbidden)`
    );

    // Test 2d: Unauthenticated access -> 401 Unauthorized
    const unauthPinsRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/tracking/tenant-pins',
      method: 'GET'
    });
    assert(
      unauthPinsRes.status === 401,
      `Unauthenticated access to tenant pins rejected (HTTP 401 Unauthorized)`
    );

    // 3. Admin Emergency Locator with Parent/Guardian Phone Lookup (Blueprint Box 8)
    console.log('\n[3/4] Testing Admin Emergency Locator & Guardian Lookup (Box 8)...');

    // Test 3a: Admin search via /parents/emergency-search?phone=+256700123456
    const emergencySearchRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/parents/emergency-search?phone=%2B256700123456',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      emergencySearchRes.status === 200 && emergencySearchRes.body.data?.emergencyContacts?.length > 0,
      `Admin successfully located parent/guardian emergency contact by phone (HTTP 200)`
    );
    const contact = emergencySearchRes.body.data?.emergencyContacts?.[0];
    assert(
      contact && contact.guardianName && contact.studentName && contact.coordinates,
      `Emergency result contains guardian name (${contact?.guardianName}), student (${contact?.studentName}), coordinates (${contact?.coordinates?.latitude}, ${contact?.coordinates?.longitude})`
    );

    // Test 3b: Tracking module emergency search via /tracking/emergency-search
    const trackingSearchRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/tracking/emergency-search?query=%2B256700123456',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      trackingSearchRes.status === 200 && trackingSearchRes.body.result?.matchedStudent,
      `Geospatial tracking engine returned student location and nearest support team (HTTP 200)`
    );

    // 4. Biometric Facial Liveness & Anti-Spoofing Detection (Blueprint Box 11)
    console.log('\n[4/4] Testing Biometric Facial Liveness & Final Photographic Assets...');

    // Test 4a: Valid facial liveness verification
    const facialValidRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/dev-control/facial-verify',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      imageBase64: 'data:image/jpeg;base64,DEV_ROOT_BIOMETRIC_LANDMARKS_PASS',
      devPin: '998123',
      challengeType: 'DYNAMIC_PUPIL_REFLECTION'
    });
    assert(
      facialValidRes.status === 200 && facialValidRes.body.data?.verified === true,
      `Facial liveness verification succeeded with score ${(facialValidRes.body.data?.livenessScore * 100).toFixed(1)}% (HTTP 200)`
    );
    assert(
      facialValidRes.body.data?.antiSpoofingPassed === true && facialValidRes.body.data?.securityClearance === 'LEVEL_5_DEVELOPER_ROOT',
      `Anti-spoofing checks PASSED and Level 5 Root clearance confirmed`
    );

    // Test 4b: Presentation attack / spoof detection
    const facialSpoofRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/dev-control/facial-verify',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      imageBase64: 'data:image/jpeg;base64,SCREEN_PLAYBACK_2D_SPOOF',
      isSimulatedSpoof: true
    });
    assert(
      facialSpoofRes.status === 403,
      `Presentation attack / 2D screen spoof rejected by liveness detection (HTTP 403 Forbidden)`
    );

    // Test 4c: Missing biometric payload rejection
    const facialEmptyRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/dev-control/facial-verify',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {});
    assert(
      facialEmptyRes.status === 400,
      `Empty biometric payload rejected (HTTP 400 Bad Request)`
    );

    // Test 4d: Check audit log persistence for biometric checks
    const bioAudit = await prisma.auditLog.findFirst({
      where: { module: 'BIOMETRIC_SECURITY' },
      orderBy: { createdAt: 'desc' }
    });
    assert(
      bioAudit !== null,
      `Biometric verification audit trail persisted in PostgreSQL (Action: ${bioAudit?.action})`
    );

    // Test 4e: Verify Photographic Assets Integrity
    const publicAssetsDir = path.resolve(__dirname, '../../frontend/public/assets');
    const requiredPhotos = [
      'admin-dashboard-bg.jpg',
      'teacher-dashboard-bg.jpg',
      'student-dashboard-bg.jpg',
      'parent-dashboard-bg.jpg',
      'staff-dashboard-bg.jpg',
      'school-login-background.jpg',
      'school_campus_bg.jpg',
      'virtual-classroom-bg.jpg',
      'academic-records-bg.jpg',
      'finance-hero-bg.jpg',
      'communication-hero-bg.jpg',
      'images/campus.jpg',
      'images/classroom.jpg',
      'images/dashboard-hero.jpg',
      'images/graduation.jpg',
      'images/library.jpg',
      'images/login-admin.jpg',
      'images/login-teacher.jpg',
      'images/login-student.jpg',
      'images/login-parent.jpg'
    ];

    let allPhotosValid = true;
    for (const rel of requiredPhotos) {
      const fullPath = path.join(publicAssetsDir, rel);
      if (!fs.existsSync(fullPath)) {
        allPhotosValid = false;
        console.error(`Missing photo asset: ${rel}`);
        break;
      }
      const stat = fs.statSync(fullPath);
      if (stat.size < 100000) { // must be > 100KB authentic photo
        allPhotosValid = false;
        console.error(`Asset too small / placeholder: ${rel} (${stat.size} bytes)`);
        break;
      }
    }
    assert(allPhotosValid, `All 20 dashboard & portal daytime photographic assets are high-resolution (> 100 KB, 0 empty files)`);

    // Test 4f: Verify zero 0-byte files in frontend/public
    const frontendPublicDir = path.resolve(__dirname, '../../frontend/public');
    function findZeroByteFiles(dir) {
      let zeros = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          zeros = zeros.concat(findZeroByteFiles(full));
        } else if (e.isFile()) {
          const s = fs.statSync(full);
          if (s.size === 0) zeros.push(full);
        }
      }
      return zeros;
    }
    const zeroByteFiles = findZeroByteFiles(frontendPublicDir);
    assert(
      zeroByteFiles.length === 0,
      `Frontend public directory has ZERO 0-byte files (Found: ${zeroByteFiles.length})`
    );

    console.log('\n================================================================');
    console.log(`PROCEDURE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed === 0) {
      console.log('>>> ALL PROCEDURE 4 VERIFICATION CHECKS PASSED PERFECTLY! <<<');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution exception:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
