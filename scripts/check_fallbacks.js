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
  const lines = content.split('\n');
  console.log(`\n=== ${file} ===`);
  lines.forEach((line, idx) => {
    if ((line.includes('setClasses(') || line.includes('setRoster(') || line.includes('setStudents(') || line.includes('setInvoices(') || line.includes('setTasks(')) && (line.includes('[') || lines[idx+1]?.includes('{'))) {
      console.log(`${idx + 1}: ${line.trim().slice(0, 80)}`);
      if (lines[idx+1]) console.log(`   +1: ${lines[idx+1].trim().slice(0, 80)}`);
    }
  });
});
