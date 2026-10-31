const fs = require('fs');
const path = require('path');
const roles = ['admin', 'teacher', 'student', 'parent', 'accountant'];
for (const r of roles) {
  const dir = path.join('frontend/src/modules/portal/pages/dashboards', r);
  const found = fs.readdirSync(dir).find(f => f.endsWith('.jsx'));
  const text = fs.readFileSync(path.join(dir, found), 'utf8');
  const tabs = [...new Set([...text.matchAll(/activeTab\s*===?\s*['"]([^'"]+)['"]/g)].map(m => m[1]))];
  console.log(r + ' (' + found + '):', tabs);
}
