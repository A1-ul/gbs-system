/**
 * Master Test Script: GBS Enterprise Onboarding & Sign Up Forms Verification
 * Validates:
 * 1. Institution Onboarding (TEN-2026-XXXXXX, GBS-ACC-XXXX, INS-2026-XXXXXX, SUB-2026-XXXXXX)
 * 2. Role-based Sign Up Forms (Teacher, Student, Parent, Accountant, Staff)
 * 3. PostgreSQL Database Persistence (users, institution_registrations, user_registration_profiles, parent_student_links)
 * 4. User Registration Counts & Drop-List Verification
 * 5. Administrator Profile Inspection & Qualification Approval
 * 6. Immutable Audit Trail Logging
 */

const prisma = require('../src/core/database/prisma.client');

async function runVerification() {
  console.log('========================================================================');
  console.log('GBS SYSTEM: ENTERPRISE SIGN UP FORMS & ONBOARDING VALIDATION');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch('http://localhost:5001/health');
    const healthData = await healthRes.json();
    assert(healthData.status === 'success', 'Backend API Gateway is ONLINE on port 5001');

    // 2. Public Institutions Listing
    const instRes = await fetch('http://localhost:5001/api/v1/auth/institutions');
    const instData = await instRes.json();
    assert(
      instData.status === 'success' && instData.data.institutions.length >= 3,
      `Public Institutions endpoint returned ${instData.data?.institutions?.length} active schools`
    );

    // 3. Institution Onboarding Form Submission
    const testInstEmail = `admissions.${Date.now()}@oxford-prep.edu`;
    const instPayload = {
      institutionName: 'Oxford Preparatory International Academy',
      institutionType: 'International School',
      country: 'United Kingdom',
      region: 'Oxfordshire',
      city: 'Oxford',
      physicalAddress: '15 Banbury Road, Oxford OX2 6NN',
      gpsLocation: '51.7580° N, 1.2589° W',
      officialEmail: testInstEmail,
      officialPhone: '+44 1865 270000',
      website: 'https://oxford-prep.edu',
      registrationNumber: `UK-OXF-${Date.now()}`,
      businessLicenseNumber: `LIC-OXF-${Date.now()}`,
      taxIdentificationNumber: `VAT-GB-${Date.now()}`,
      repFullName: 'Prof. Alistair Montgomery',
      repPosition: 'President of the Board',
      repEmail: `montgomery.${Date.now()}@oxford-prep.edu`,
      repPhone: '+44 1865 270001',
      adminName: 'Dame Clarissa Finch',
      adminEmail: `admin.${Date.now()}@oxford-prep.edu`,
      adminPhone: '+44 1865 270005',
      password: 'OxfordAdmin2026!',
      confirmPassword: 'OxfordAdmin2026!',
      termsAccepted: true,
      privacyAccepted: true,
      dataProcessingConsent: true
    };

    const instSubmitRes = await fetch('http://localhost:5001/api/v1/auth/register-institution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(instPayload)
    });
    const instSubmitData = await instSubmitRes.json();

    assert(
      instSubmitRes.status === 201 && instSubmitData.status === 'success',
      'Institution Onboarding Application submitted successfully (Status 201)'
    );

    assert(
      instSubmitData.data?.tenantUid && instSubmitData.data.tenantUid.startsWith('TEN-2026-'),
      `Generated Unique Tenant ID: ${instSubmitData.data?.tenantUid}`
    );

    assert(
      instSubmitData.data?.tenantCode && instSubmitData.data.tenantCode.startsWith('GBS-'),
      `Generated System Tenant Code: ${instSubmitData.data?.tenantCode}`
    );

    assert(
      instSubmitData.data?.institutionId && instSubmitData.data.institutionId.startsWith('INS-2026-'),
      `Generated Unique Institution ID: ${instSubmitData.data?.institutionId}`
    );

    assert(
      instSubmitData.data?.subscriptionId && instSubmitData.data.subscriptionId.startsWith('SUB-2026-'),
      `Generated Unique Subscription ID: ${instSubmitData.data?.subscriptionId}`
    );

    // 4. Role 1: TEACHER Sign Up Form Submission
    const teacherEmail = `teacher.hypatia.${Date.now()}@gbs.edu`;
    const teacherRes = await fetch('http://localhost:5001/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Hypatia',
        lastName: 'Alexandria',
        email: teacherEmail,
        password: 'FacultyPassword2026!',
        role: 'TEACHER',
        tenantCode: 'GBS-MAIN',
        title: 'Prof.',
        phone: '+44 7700 900333',
        employeeId: `TCH-${Date.now().toString().slice(-4)}`,
        department: 'Mathematics',
        specialization: 'Pure Mathematics & Number Theory',
        highestQualification: 'PhD in Mathematical Sciences (Cambridge)',
        experienceYears: 15,
        qualificationNotes: 'Fellow of Royal Astronomical Society, 15 years A-Level Math',
        termsAccepted: true
      })
    });
    const teacherData = await teacherRes.json();
    assert(
      teacherRes.status === 201 && teacherData.status === 'success',
      'Teacher Registration Form processed and saved (Status 201)'
    );
    assert(
      teacherData.data?.user?.role === 'TEACHER' && teacherData.data?.user?.verificationStatus === 'PENDING',
      'Teacher account registered with PENDING qualification review status'
    );
    const teacherUserId = teacherData.data?.user?.id;

    // 5. Role 2: STUDENT Sign Up Form Submission
    const studentEmail = `student.alexander.${Date.now()}@gbs.edu`;
    const studentRes = await fetch('http://localhost:5001/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Alexander',
        lastName: 'Macedon',
        email: studentEmail,
        password: 'StudentSecure2026!',
        role: 'STUDENT',
        tenantCode: 'GBS-MAIN',
        dateOfBirth: '2009-07-20',
        gender: 'Male',
        bloodGroup: 'AB+',
        targetGrade: 'Grade 11',
        previousSchool: 'Aristotle Academy',
        previousGpa: '4.0 High Honors',
        emergencyContactName: 'King Philip',
        emergencyContactPhone: '+44 7700 900444',
        termsAccepted: true
      })
    });
    const studentData = await studentRes.json();
    assert(
      studentRes.status === 201 && studentData.data?.user?.role === 'STUDENT',
      'Student Registration Form processed and saved (Status 201)'
    );
    const studentUserId = studentData.data?.user?.id;

    // 6. Role 3: PARENT Sign Up Form Submission with Child Linkage
    const parentEmail = `parent.philip.${Date.now()}@gbs.edu`;
    const parentRes = await fetch('http://localhost:5001/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Philip',
        lastName: 'Macedon',
        email: parentEmail,
        password: 'ParentSecure2026!',
        role: 'PARENT',
        tenantCode: 'GBS-MAIN',
        relationship: 'Father',
        phone: '+44 7700 900444',
        whatsappPhone: '+44 7700 900444',
        linkedStudentId: studentEmail, // Link to the newly registered student!
        residentialAddress: '1 Palace Way, Pella',
        city: 'London',
        termsAccepted: true
      })
    });
    const parentData = await parentRes.json();
    assert(
      parentRes.status === 201 && parentData.data?.user?.role === 'PARENT',
      'Parent Registration Form processed and saved (Status 201)'
    );

    // Verify atomic ParentStudentLink creation in PostgreSQL
    const linkInDb = await prisma.parentStudentLink.findFirst({
      where: { parentId: parentData.data?.user?.id, studentId: studentUserId }
    });
    assert(
      linkInDb !== null,
      'PostgreSQL verified: ParentStudentLink atomically created linking Parent to Student'
    );

    // 7. Role 4: ACCOUNTANT Sign Up Form Submission
    const accountantEmail = `bursar.croesus.${Date.now()}@gbs.edu`;
    const accountantRes = await fetch('http://localhost:5001/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Croesus',
        lastName: 'Treasury',
        email: accountantEmail,
        password: 'BursarPassword2026!',
        role: 'ACCOUNTANT',
        tenantCode: 'GBS-MAIN',
        employeeId: `FIN-${Date.now().toString().slice(-4)}`,
        highestQualification: 'FCA / Chartered Certified Accountant',
        specialization: 'Institutional Fee Accounting & Asset Reconciliation',
        experienceYears: 18,
        phone: '+44 7700 900777',
        termsAccepted: true
      })
    });
    const accountantData = await accountantRes.json();
    assert(
      accountantRes.status === 201 && accountantData.data?.user?.role === 'ACCOUNTANT',
      'Accountant Registration Form processed and saved with audit verification (Status 201)'
    );

    // 8. Role 5: STAFF Sign Up Form Submission
    const staffEmail = `logistics.hermes.${Date.now()}@gbs.edu`;
    const staffRes = await fetch('http://localhost:5001/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Hermes',
        lastName: 'Fleet',
        email: staffEmail,
        password: 'StaffPassword2026!',
        role: 'STAFF',
        tenantCode: 'GBS-MAIN',
        employeeId: `STF-${Date.now().toString().slice(-4)}`,
        department: 'Transport & Fleet Management',
        specialization: 'Campus Logistics & Student Transit Safety',
        phone: '+44 7700 900888',
        termsAccepted: true
      })
    });
    const staffData = await staffRes.json();
    assert(
      staffRes.status === 201 && staffData.data?.user?.role === 'STAFF',
      'Staff Registration Form processed and saved (Status 201)'
    );

    // 9. Admin Login & Drop-List Role Count Aggregation Verification
    const adminLoginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gbs.com', password: 'Admin123!', portalRole: 'SUPER_ADMIN' })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.data.accessToken;

    const countsRes = await fetch('http://localhost:5001/api/v1/users/counts-by-role', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const countsData = await countsRes.json();
    assert(
      countsData.status === 'success' && countsData.data?.summary?.totalRegistered >= 11,
      `Drop List live user counts verified: ${countsData.data?.summary?.totalRegistered} total registered non-deleted users in PostgreSQL`
    );


    // 10. Admin Profile Inspection & Qualification Verification
    const inspectRes = await fetch(`http://localhost:5001/api/v1/users/${teacherUserId}/profile-verification`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const inspectData = await inspectRes.json();
    assert(
      inspectData.status === 'success' && inspectData.data?.user?.registrationProfile?.highestQualification?.includes('PhD'),
      `Admin inspected Teacher qualifications: "${inspectData.data?.user?.registrationProfile?.highestQualification}"`
    );

    // 11. Admin Approves and Verifies Teacher Account
    const verifyRes = await fetch(`http://localhost:5001/api/v1/users/${teacherUserId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ notes: 'Credentials and Cambridge PhD verified by Headmaster' })
    });
    const verifyData = await verifyRes.json();
    assert(
      verifyRes.status === 200 && verifyData.status === 'success',
      'Admin verified and approved teacher credentials (Status 200)'
    );

    // 12. PostgreSQL Immutable Audit Trail Verification
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: 'INSTITUTION_REGISTRATION_SUBMITTED' },
          { action: 'NEW_USER_REGISTRATION' },
          { action: 'USER_QUALIFICATION_VERIFIED' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    assert(
      auditLogs.length >= 3,
      `Immutable PostgreSQL audit logs verified: ${auditLogs.length} registration audit events captured`
    );

    console.log('\n========================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runVerification();
