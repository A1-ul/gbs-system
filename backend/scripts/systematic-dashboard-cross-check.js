const http = require("http");

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
    { name: "Alumni Network Sign-In Gateway (/login/alumni)", url: "http://localhost:3000/login/alumni" },
    { name: "Mobile LAN External Frontend Address (http://192.168.100.30:3000)", url: "http://192.168.100.30:3000/" },
    { name: "Mobile LAN External Backend Address (http://192.168.100.30:5001)", url: "http://192.168.100.30:5001/health" }
  ];

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    process.stdout.write(`[${i + 1}/${tests.length}] Checking ${t.name}... `);
    const res = await checkUrl(t.url);
    if (res.ok || (t.allowAuthRequired && res.status === 401)) {
      console.log(`✅ PASSED (${res.status}${res.status === 401 ? " Auth Guard Verified" : ""}) [Bytes: ${res.dataLength}]`);
      passed++;
    } else {
      console.log(`❌ FAILED (${res.status || res.error})`);
      failed++;
    }
  }

  console.log("==========================================================================");
  console.log(`🎯 CROSS-CHECK RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${tests.length})`);
  console.log("==========================================================================");
  process.exit(failed > 0 ? 1 : 0);
}

runSystematicCrossCheck();
