const fs = require('fs');
const s = fs.readFileSync('frontend/src/modules/portal/pages/dashboards/student/StudentDashboard.jsx', 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Transcript') || lines[i].includes('transcript') || lines[i].includes('Report Card') || lines[i].includes('report-card') || lines[i].includes('customSchoolLogo') || lines[i].includes('schoolLogo')) {
    console.log(i + 1, lines[i].trim().substring(0, 100));
  }
}
