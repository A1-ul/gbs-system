const fs = require('fs');

const files = [
  'frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.jsx',
  'frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx',
  'frontend/src/modules/portal/pages/dashboards/student/StudentDashboard.jsx',
  'frontend/src/modules/portal/pages/dashboards/parent/ParentDashboard.jsx',
  'frontend/src/modules/portal/pages/dashboards/accountant/AccountantDashboard.jsx',
  'frontend/src/modules/portal/pages/dashboards/staff/StaffDashboard.jsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  console.log(`\n=== ${file} (${content.split('\n').length} lines) ===`);
  const lines = content.split('\n');
  lines.slice(0, 120).forEach((line, idx) => {
    if (line.includes('useState([') || line.includes('useState({') || line.includes('mock') || line.includes('fake') || line.includes('Dummy') || line.includes('dummy')) {
      console.log(`${idx + 1}: ${line.trim().slice(0, 90)}`);
    }
  });
});
