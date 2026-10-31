const fs = require('fs');
const s = fs.readFileSync('frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx', 'utf8');
const queries = ['APPROVED BY HEADMASTER', 'attendance', 'Exam', 'publish'];
for (const q of queries) {
  let idx = s.indexOf(q);
  if (idx !== -1) {
    const line = s.substring(0, idx).split('\n').length;
    console.log(`Query "${q}" found at line ${line}`);
  } else {
    console.log(`Query "${q}" NOT found`);
  }
}
