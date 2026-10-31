const fs = require('fs');
const s = fs.readFileSync('frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx', 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('SMS') || lines[i].includes('sms') || lines[i].includes('message') || lines[i].includes('directive') || lines[i].includes('remote')) {
    console.log(i + 1, lines[i].trim().substring(0, 100));
  }
}
