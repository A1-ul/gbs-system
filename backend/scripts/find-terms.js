const fs = require('fs');
const s = fs.readFileSync('frontend/src/modules/portal/pages/dashboards/admin/AdminDashboard.jsx', 'utf8');
const terms = ['customSchoolLogo', 'GBS INTERNATIONAL SCHOOL', 'schoolName', 'school_name', 'gbs_report_school_name', 'cease', 'warning'];
for (const term of terms) {
  let idx = 0;
  let count = 0;
  while ((idx = s.indexOf(term, idx)) !== -1) {
    if (count === 0) {
      const line = s.substring(0, idx).split('\n').length;
      console.log(`Found "${term}" at line ${line}`);
    }
    count++;
    idx += term.length;
  }
  if (count === 0) console.log(`Term "${term}" NOT found`);
  else console.log(`Total occurrences of "${term}": ${count}`);
}
