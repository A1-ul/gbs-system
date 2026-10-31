const http = require("http");
const authService = require("../src/modules/auth/auth.service");

async function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 6000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 400,
          dataLength: data.length,
          snippet: data.substring(0, 150)
        });
      });
    });
    req.on("error", (err) => {
      resolve({ status: 0, ok: false, error: err.message });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 408, ok: false, error: "Timed out" });
    });
  });
}

async function runSystematicCrossCheck() {
  console.log("==========================================================================");
  console.log("🚀 STARTING AUTOMATED GBS SYSTEM DASHBOARD-BY-DASHBOARD CROSS-CHECK SUITE");
  console.log("==========================================================================");

  let passed = 0;
  let failed = 0;

  // 1. URL Connectivity & Routing Tests
  const tests = [
    { name: "Backend Core Health & PostgreSQL Pool", url: "http://localhost:5001/health" },
    { name: "Developer Mission Control API (Infrastructure Alerts)", url: "http://localhost:5001/api/v1/dev-control/alerts" },
    { name: "Developer Encrypted Backups Engine", url: "http://localhost:5001/api/v1/dev-control/backups" },
    { name: "Facility & Operations Work Order Ledger", url: "http://localhost:5001/api/v1/facility/tickets" },
    { name: "Academic Admissions Directorate Ledger (Guarded by JWT Auth)", url: "http://localhost:5001/api/v1/admissions", allowAuthRequired: true },
    { name: "Frontend Main Gateway & Login (GBS SCHOOL MANAGEMENT SYSTEM)", url: "http://localhost:3000/" },
    { name: "Headmaster Command Portal Route (/portal/admin/dashboard)", url: "http://localhost:3000/portal/admin/dashboard" },
    { name: "Teacher Academic Suite Route (/portal/teacher/dashboard)", url: "http://localhost:3000/portal/teacher/dashboard" },
    { name: "Student Learning Portal Route (/portal/student/dashboard)", url: "http://localhost:3000/portal/student/dashboard" },
    { name: "Parent & Guardian Hub Route (/portal/parent/dashboard)", url: "http://localhost:3000/portal/parent/dashboard" },
    { name: "Finance & Bursar Desk Route (/portal/accountant/dashboard)", url: "http://localhost:3000/portal/accountant/dashboard" },
    { name: "HR Directorate Portal Route (/portal/hr/dashboard)", url: "http://localhost:3000/portal/hr/dashboard" },
    { name: "Alumni & Convocation Network Route (/portal/alumni/dashboard)", url: "http://localhost:3000/portal/alumni/dashboard" },
    { name: "Campus Logistics & Staff Portal Route (/portal/staff/dashboard)", url: "http://localhost:3000/portal/staff/dashboard" },
    { name: "Developer Mission Control Hub Route (/developer-control-center/dashboard)", url: "http://localhost:3000/developer-control-center/dashboard" },
    { name: "Interactive Video Presentation Engine (/presentation-engine)", url: "http://localhost:3000/presentation-engine" },
    { name: "HR Autonomous Registration Track (/signup/hr)", url: "http://localhost:3000/signup/hr" },
    { name: "Alumni Convocation Registration Track (/signup/alumni)", url: "http://localhost:3000/signup/alumni" },
    { name: "HR Portal Sign-In Gateway (/login/hr)", url: "http://localhost:3000/login/hr" },
    { name: "Alumni Network Sign-In Gateway (/login/alumni)", url: "http://localhost:3000/login/alumni" }
  ];

  console.log("\n--- [STAGE 1] PORTAL & DASHBOARD ROUTING CHECKS ---");
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    process.stdout.write(`[${i + 1}/${tests.length}] Checking ${t.name}... `);
    const res = await checkUrl(t.url);
    if (res.ok || (t.allowAuthRequired && res.status === 401)) {
      console.log(`✅ PASSED (${res.status}${res.status === 401 ? " Auth Guard Verified" : ""})`);
      passed++;
    } else {
      console.log(`❌ FAILED (${res.status || res.error})`);
      failed++;
    }
  }

  // 2. Authentication & Authorization Tests for All Portals
  console.log("\n--- [STAGE 2] ROLE AUTHENTICATION & CREDENTIAL VERIFICATION ---");
  const authRoles = [
    { name: "Headmaster / Super Admin Portal", email: "admin@gbs.com", pass: "Admin123!", portalRole: "ADMIN" },
    { name: "Teacher Academic Portal", email: "teacher@gbs.com", pass: "Teacher123!", portalRole: "TEACHER" },
    { name: "Student Learning Portal", email: "student@gbs.com", pass: "Student123!", portalRole: "STUDENT" },
    { name: "Parent & Guardian Portal", email: "parent@gbs.com", pass: "Parent123!", portalRole: "PARENT" },
    { name: "Finance & Accountant Portal", email: "accountant@gbs.com", pass: "Accountant123!", portalRole: "ACCOUNTANT" },
    { name: "Campus Logistics & Staff Portal", email: "staff@gbs.com", pass: "Staff123!", portalRole: "STAFF" },
    { name: "HR Directorate Portal", email: "hr@gbs.com", pass: "Hr123!", portalRole: "HR" },
    { name: "Alumni & Convocation Portal", email: "alumni@gbs.com", pass: "Alumni123!", portalRole: "ALUMNI" },
    { name: "Developer Control Center", email: "gabosei48@gmail.com", pass: "0543294615Gab", portalRole: "DEVELOPER" }
  ];

  for (let i = 0; i < authRoles.length; i++) {
    const r = authRoles[i];
    process.stdout.write(`[${i + 1}/${authRoles.length}] Verifying Authentication for ${r.name} (${r.email})... `);
    try {
      const authRes = await authService.login({ email: r.email, password: r.pass, portalRole: r.portalRole });
      if (authRes?.accessToken && authRes?.user) {
        console.log(`✅ PASSED (Role: ${authRes.user.role}, Token: ${authRes.accessToken.slice(0, 15)}...)`);
        passed++;
      } else {
        console.log(`❌ FAILED (Invalid session payload)`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ FAILED (${err.message})`);
      failed++;
    }
  }

  // 3. User & Institution Registration
  console.log("\n--- [STAGE 3] ONLINE REGISTRATION & MULTI-TENANT ONBOARDING ---");
  process.stdout.write("[1/3] Testing Public Institutions Catalog Retrieval... ");
  try {
    const institutions = await authService.getPublicInstitutions();
    if (Array.isArray(institutions) && institutions.length > 0) {
      console.log(`✅ PASSED (${institutions.length} Institutions Available, First: ${institutions[0].name})`);
      passed++;
    } else {
      console.log("❌ FAILED (Empty institution catalog)");
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAILED (${err.message})`);
    failed++;
  }

  process.stdout.write("[2/3] Testing Dynamic User Registration (Student Member)... ");
  try {
    const regUser = await authService.register({
      firstName: "Kofi",
      lastName: "Ansah",
      email: `kofi.${Date.now()}@student.gbs.edu`,
      password: "Password123!",
      role: "STUDENT"
    });
    if (regUser?.user && regUser?.accessToken) {
      console.log(`✅ PASSED (Registered: ${regUser.user.email}, Role: ${regUser.user.role})`);
      passed++;
    } else {
      console.log("❌ FAILED (User registration failed)");
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAILED (${err.message})`);
    failed++;
  }

  process.stdout.write("[3/3] Testing Dynamic Institution Onboarding (New School)... ");
  try {
    const regInst = await authService.registerInstitution({
      institutionName: "Accra Royal Academy",
      officialEmail: `info.${Date.now()}@ara.edu`,
      adminEmail: `headmaster.${Date.now()}@ara.edu`,
      password: "Password123!",
      confirmPassword: "Password123!",
      termsAccepted: true,
      privacyAccepted: true,
      dataProcessingConsent: true
    });
    if (regInst?.registration?.tenantCode) {
      console.log(`✅ PASSED (Code: ${regInst.registration.tenantCode}, Status: ${regInst.registration.status})`);
      passed++;
    } else {
      console.log("❌ FAILED (Institution onboarding failed)");
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAILED (${err.message})`);
    failed++;
  }

  console.log("\n==========================================================================");
  console.log(`🎯 MASTER CROSS-CHECK COMPLETE: ${passed} PASSED, ${failed} FAILED (TOTAL CHECKS: ${passed + failed})`);
  console.log("==========================================================================");
  process.exit(failed > 0 ? 1 : 0);
}

runSystematicCrossCheck();
