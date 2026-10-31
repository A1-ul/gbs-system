const fs = require('fs');
const s = fs.readFileSync('frontend/src/modules/auth/pages/SignUpPage.jsx', 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('role') || lines[i].includes('Role') || lines[i].includes('HR') || lines[i].includes('Human Resources')) {
    console.log(i + 1, lines[i].trim().substring(0, 100));
  }
}
