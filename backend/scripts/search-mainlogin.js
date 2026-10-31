const fs = require('fs');
const s = fs.readFileSync('frontend/src/modules/auth/pages/MainLoginPage.jsx', 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('GBS INTERNATIONAL SCHOOL') || lines[i].includes('GBS International School') || lines[i].includes('GBS Enterprise')) {
    console.log(i + 1, lines[i].trim().substring(0, 100));
  }
}
