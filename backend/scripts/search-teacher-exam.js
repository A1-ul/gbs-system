const fs = require('fs');
const s = fs.readFileSync('frontend/src/modules/portal/pages/dashboards/teacher/TeacherDashboard.jsx', 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('handlePublishNewExam') || lines[i].includes('publishExam') || lines[i].includes('questions') && lines[i].includes('upload')) {
    console.log(i + 1, lines[i].trim().substring(0, 100));
  }
}
