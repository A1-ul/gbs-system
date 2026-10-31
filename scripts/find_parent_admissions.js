const fs = require('fs');
const content = fs.readFileSync('frontend/src/modules/portal/pages/dashboards/parent/ParentDashboard.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('activeTab === "admissions"') || line.includes('parentApplications') || line.includes('admissionApprovedNotice')) {
    console.log(`${idx + 1}: ${line.trim().slice(0, 100)}`);
  }
});
