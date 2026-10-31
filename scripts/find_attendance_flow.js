const fs = require('fs');

function checkFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  console.log('=== ' + filepath + ' ===');
  lines.forEach((line, idx) => {
    if (line.includes('weekly') || line.includes('Weekly') || line.includes('approve') || line.includes('Approve') || line.includes('attendance') || line.includes('Attendance')) {
      if (line.includes('week') || line.includes('Week') || line.includes('verify') || line.includes('Verify') || line.includes('headmaster') || line.includes('Headmaster')) {
        console.log(`${idx + 1}: ${line.trim().slice(0, 100)}`);
      }
    }
  });
}

checkFile('frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx');
checkFile('frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.jsx');
checkFile('frontend/src/modules/attendance/pages/AttendanceDashboard.jsx');
