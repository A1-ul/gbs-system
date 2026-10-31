const https = require("https");

const BASE_URL = "https://gbs-system.onrender.com";

async function makeRequest(path, method = "GET", body = null, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(postData) } : {}),
        ...headers
      },
      timeout: 25000
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({
          statusCode: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 400,
          headers: res.headers,
          dataLength: data.length,
          json: json,
          text: data
        });
      });
    });

    req.on("error", (err) => {
      resolve({ statusCode: 0, ok: false, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ statusCode: 408, ok: false, error: "Request timed out" });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runLiveAudit() {
  console.log("==========================================================================");
  console.log("🌍 RUNNING LIVE PRODUCTION AUDIT ON https://gbs-system.onrender.com");
  console.log("==========================================================================");

  let passed = 0;
  let failed = 0;

  async function assert(name, fn) {
    process.stdout.write(`⏳ Testing: ${name}... `);
    try {
      const res = await fn();
      if (res && res.success) {
        console.log(`✅ PASSED (${res.info || "OK"})`);
        passed++;
      } else {
        console.log(`❌ FAILED (${res ? res.error : "Unknown assertion failure"})`);
        failed++;
      }
    } catch (e) {
      console.log(`❌ EXCEPTION: ${e.message}`);
      failed++;
    }
  }

  // 1. HEALTH & CONNECTIVITY
  console.log("\n--- [STAGE 1] SYSTEM HEALTH & RUNTIME DISCOVERY ---");
  await assert("Live Cloud Backend Health (/api/v1/health)", async () => {
    const res = await makeRequest("/api/v1/health");
    return {
      success: res.ok && res.json && res.json.status === "success",
      info: `HTTP ${res.statusCode} - ${res.json?.message || "Online"}`
    };
  });

  await assert("Public Institutions Directory (/api/v1/auth/institutions)", async () => {
    const res = await makeRequest("/api/v1/auth/institutions");
    const count = res.json?.data?.institutions?.length || 0;
    return {
      success: res.ok && count > 0,
      info: `HTTP ${res.statusCode} - Found ${count} institution(s)`
    };
  });

  // 2. LIVE ROLE AUTHENTICATION
  console.log("\n--- [STAGE 2] LIVE AUTHENTICATION FOR ALL 9 USER ROLES ---");
  const loginTests = [
    { role: "DEVELOPER", user: "gabosei48@gmail.com", pass: "0543294615Gab", endpoint: "/api/v1/auth/login", portal: "DEVELOPER" },
    { role: "ADMIN", user: "superadmin", pass: "admin123", endpoint: "/api/v1/auth/login", portal: "ADMIN" },
    { role: "TEACHER", user: "teacher1", pass: "teacher123", endpoint: "/api/v1/auth/login", portal: "TEACHER" },
    { role: "STUDENT", user: "student1", pass: "student123", endpoint: "/api/v1/auth/login", portal: "STUDENT" },
    { role: "PARENT", user: "parent1", pass: "parent123", endpoint: "/api/v1/auth/login", portal: "PARENT" },
    { role: "ACCOUNTANT", user: "accountant@gbs.com", pass: "Accountant123!", endpoint: "/api/v1/auth/login", portal: "ACCOUNTANT" },
    { role: "ACCOUNTANT (ALT)", user: "accountant1", pass: "Accountant123!", endpoint: "/api/v1/auth/login", portal: "ACCOUNTANT" },
    { role: "HR", user: "hr@gbs.com", pass: "Hr123!", endpoint: "/api/v1/auth/login", portal: "HR" },
    { role: "HR (ALT)", user: "hr1", pass: "Hr123!", endpoint: "/api/v1/auth/login", portal: "HR" },
    { role: "STAFF", user: "staff1", pass: "staff123", endpoint: "/api/v1/auth/login", portal: "STAFF" },
    { role: "ALUMNI", user: "alumni1", pass: "alumni123", endpoint: "/api/v1/auth/login", portal: "ALUMNI" }
  ];

  for (const t of loginTests) {
    await assert(`Login: [${t.role}] - user: "${t.user}"`, async () => {
      const res = await makeRequest(t.endpoint, "POST", {
        identifier: t.user,
        email: t.user,
        username: t.user,
        password: t.pass,
        portal: t.portal,
        portalRole: t.portal
      });
      const hasToken = !!res.json?.data?.accessToken;
      const userName = res.json?.data?.user?.username || res.json?.data?.user?.email;
      return {
        success: res.ok && hasToken,
        info: `Token issued for user: ${userName}`,
        error: res.json?.message || `HTTP ${res.statusCode}`
      };
    });
  }

  // 3. DYNAMIC REGISTRATION IN LIVE CLOUD
  console.log("\n--- [STAGE 3] LIVE USER & INSTITUTION DYNAMIC ONBOARDING ---");
  const testEmail = `live_student_${Date.now()}@gbs-test.org`;
  await assert(`Dynamic Student Self-Registration (${testEmail})`, async () => {
    const res = await makeRequest("/api/v1/auth/register", "POST", {
      email: testEmail,
      username: `student_${Date.now()}`,
      password: "TestPassword123!",
      fullName: "Kofi Owusu Mensah",
      firstName: "Kofi",
      lastName: "Mensah",
      role: "STUDENT",
      institutionId: "tnt_master_default",
      phone: "0240001122"
    });
    const hasToken = !!res.json?.data?.accessToken;
    return {
      success: (res.statusCode === 201 || res.statusCode === 200) && hasToken,
      info: `User created and auto-authenticated (HTTP ${res.statusCode})`,
      error: res.json?.message || `HTTP ${res.statusCode}`
    };
  });

  const testSchoolName = `GBS Premier Academy ${Date.now() % 10000}`;
  await assert(`Dynamic New Institution Onboarding ("${testSchoolName}")`, async () => {
    const res = await makeRequest("/api/v1/auth/register-institution", "POST", {
      institutionName: testSchoolName,
      institutionType: "SECONDARY",
      curriculum: "WASSCE",
      officialEmail: `office_${Date.now()}@gbs-school.edu`,
      adminEmail: `headmaster_${Date.now()}@gbs-school.edu`,
      repFullName: "Dr. Kwabena Asante",
      repEmail: `headmaster_${Date.now()}@gbs-school.edu`,
      repPhone: "0554594193",
      country: "Ghana",
      password: "SchoolAdmin2026!",
      confirmPassword: "SchoolAdmin2026!",
      termsAccepted: true,
      privacyAccepted: true,
      dataProcessingConsent: true
    });
    const inst = res.json?.data?.institution || res.json?.data;
    return {
      success: (res.statusCode === 201 || res.statusCode === 200) && !!inst,
      info: `Tenant UID: ${inst?.tenantUid || "Auto-Provisioned"} (HTTP ${res.statusCode})`,
      error: res.json?.message || `HTTP ${res.statusCode}`
    };
  });

  const trialSchoolName = `GBS Trial Academy ${Date.now() % 10000}`;
  await assert(`Dynamic 1-Month Free Trial Onboarding ("${trialSchoolName}")`, async () => {
    const res = await makeRequest("/api/v1/auth/register-institution", "POST", {
      institutionName: trialSchoolName,
      institutionType: "PRIMARY",
      curriculum: "NATIONAL",
      officialEmail: `trial_${Date.now()}@gbs-trial.edu`,
      adminEmail: `admin_${Date.now()}@gbs-trial.edu`,
      repFullName: "Madam Grace Appiah",
      repEmail: `admin_${Date.now()}@gbs-trial.edu`,
      repPhone: "0244123456",
      country: "Ghana",
      password: "TrialSchool2026!",
      confirmPassword: "TrialSchool2026!",
      subscriptionTier: "trial_1m",
      momoTransactionId: "FREE_TRIAL_AUTO",
      termsAccepted: true,
      privacyAccepted: true,
      dataProcessingConsent: true
    });
    const inst = res.json?.data?.institution || res.json?.data;
    return {
      success: (res.statusCode === 201 || res.statusCode === 200) && !!inst,
      info: `Free Trial Tenant UID: ${inst?.tenantUid || "Auto-Provisioned"} (HTTP ${res.statusCode})`,
      error: res.json?.message || `HTTP ${res.statusCode}`
    };
  });

  // 4. MOBILE BROWSER RESPONSIVE PORTAL ROUTES
  console.log("\n--- [STAGE 4] MOBILE BROWSER SPA ROUTE DELIVERY & BUNDLE VERIFICATION ---");
  const mobileRoutes = [
    { name: "Root Mobile Gateway", path: "/" },
    { name: "Admin Dashboard Route", path: "/portal/admin/dashboard" },
    { name: "Teacher Dashboard Route", path: "/portal/teacher/dashboard" },
    { name: "Student Dashboard Route", path: "/portal/student/dashboard" },
    { name: "Parent Dashboard Route", path: "/portal/parent/dashboard" },
    { name: "Accountant Dashboard Route", path: "/portal/accountant/dashboard" },
    { name: "HR Dashboard Route", path: "/portal/hr/dashboard" },
    { name: "Alumni Dashboard Route", path: "/portal/alumni/dashboard" },
    { name: "Staff Dashboard Route", path: "/portal/staff/dashboard" },
    { name: "Developer Control Center Dashboard", path: "/developer-control-center/dashboard" },
    { name: "Role Specific Login (Admin)", path: "/login/admin" },
    { name: "Role Specific Login (Teacher)", path: "/login/teacher" },
    { name: "Role Specific Login (Student)", path: "/login/student" },
    { name: "Role Specific Login (Developer)", path: "/login/developer" },
    { name: "Registration Hub", path: "/signup" },
    { name: "Live Fleet Tracking System", path: "/portal/live-tracking" }
  ];

  for (const r of mobileRoutes) {
    await assert(`Mobile Delivery: ${r.name} (${r.path})`, async () => {
      const res = await makeRequest(r.path);
      const isHtml = (res.headers["content-type"] || "").includes("text/html");
      const hasRoot = res.text.includes('id="root"');
      const hasNewBundle = res.text.includes("index-COvgGTSD.js");
      return {
        success: res.ok && isHtml && hasRoot && hasNewBundle,
        info: `HTTP ${res.statusCode} | SPA Root Mounted | Bundle: index-COvgGTSD.js`,
        error: `HTTP ${res.statusCode} (isHtml: ${isHtml}, hasRoot: ${hasRoot}, hasNewBundle: ${hasNewBundle})`
      };
    });
  }

  console.log("\n==========================================================================");
  console.log(`🏁 PRODUCTION SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveAudit();
