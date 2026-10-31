const fs = require('fs');
const s = fs.readFileSync('frontend/src/modules/portal/pages/dashboards/accountant/AccountantDashboard.jsx', 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export') || lines[i].includes('Export') || lines[i].includes('CSV') || lines[i].includes('csv') || lines[i].includes('Spreadsheet')) {
    console.log(i + 1, lines[i].trim().substring(0, 100));
  }
}
