const fs = require('fs');
const path = require('path');

const dashboards = [
  { name: 'AdminDashboard', path: 'frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.jsx' },
  { name: 'TeacherDashboard', path: 'frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx' },
  { name: 'StudentDashboard', path: 'frontend/src/modules/portal/pages/dashboards/student/StudentDashboard.jsx' },
  { name: 'ParentDashboard', path: 'frontend/src/modules/portal/pages/dashboards/parent/ParentDashboard.jsx' },
  { name: 'AccountantDashboard', path: 'frontend/src/modules/portal/pages/dashboards/accountant/AccountantDashboard.jsx' },
  { name: 'StaffDashboard', path: 'frontend/src/modules/portal/pages/dashboards/staff/StaffDashboard.jsx' },
  { name: 'HRDashboard', path: 'frontend/src/modules/portal/pages/dashboards/hr/HRDashboard.jsx' },
  { name: 'AlumniDashboard', path: 'frontend/src/modules/alumni/pages/AlumniDashboard.jsx' },
  { name: 'DeveloperDashboard', path: 'frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx' }
];

console.log('--- SCANNING DASHBOARDS FOR HARDCODED MOCK / FAKE DATA ---');

dashboards.forEach(d => {
  const full = path.resolve('d:/version1/GBS_SYSTEM', d.path);
  if (!fs.existsSync(full)) {
    console.log(`Missing: ${d.name}`);
    return;
  }
  const content = fs.readFileSync(full, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=== ${d.name} (${lines.length} lines) ===`);

  // Find useState with arrays or hardcoded mock objects
  lines.forEach((line, idx) => {
    if (line.includes('useState(') && (line.includes('[{') || line.includes('(() =>') || line.includes('["') || line.includes("['"))) {
      console.log(`  Line ${idx + 1}: ${line.trim().substring(0, 100)}`);
    }
    // Also look for hardcoded arrays of demo objects
    if (line.trim().startsWith('const MOCK_') || line.trim().startsWith('const DEMO_') || line.trim().startsWith('const INITIAL_')) {
      console.log(`  Line ${idx + 1} CONST: ${line.trim().substring(0, 100)}`);
    }
  });
});
