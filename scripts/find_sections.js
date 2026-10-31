const fs = require('fs');
const content = fs.readFileSync('frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
lines.forEach((line, idx) => {
  if (line.includes('activeTab') || line.includes('Biometric') || line.includes('biometric') || line.includes('padlock') || line.includes('Padlock')) {
    console.log(`${idx + 1}: ${line.trim().slice(0, 100)}`);
  }
});
