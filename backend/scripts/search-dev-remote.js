const fs = require('fs');
const s = fs.readFileSync('frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx', 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Remote') || lines[i].includes('remote') || lines[i].includes('executeCommand') || lines[i].includes('handleExecute') || lines[i].includes('command')) {
    if (lines[i].includes('remote') || lines[i].includes('Remote') || lines[i].includes('Command')) {
      console.log(i + 1, lines[i].trim().substring(0, 100));
    }
  }
}
